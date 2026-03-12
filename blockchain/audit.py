"""
FloatChat - Blockchain Audit Module
====================================
Logs an immutable SHA-256 hash of every successful query to the
FloatChatAudit smart contract on Polygon Amoy testnet.

What goes on-chain per query:
  SHA256( user_question + generated_sql + JSON(results) )

The returned tx_hash is surfaced to the user and can be verified
at https://amoy.polygonscan.com/tx/<tx_hash>
"""

import hashlib
import json
import os
import asyncio
import logging
from pathlib import Path
from typing import Optional

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────

AMOY_RPC_URL = os.getenv(
    "POLYGON_AMOY_RPC_URL",
    "https://rpc-amoy.polygon.technology/"
)
CONTRACT_ADDRESS = os.getenv("FLOATCHAT_CONTRACT_ADDRESS", "")
WALLET_ADDRESS   = os.getenv("BLOCKCHAIN_WALLET_ADDRESS", "")
PRIVATE_KEY      = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")

# ABI lives next to this file
_ABI_PATH = Path(__file__).parent / "contract_abi.json"

# ── Web3 Setup ─────────────────────────────────────────────────────────────────

def _build_web3() -> Optional[Web3]:
    """Creates and validates a Web3 connection to Polygon Amoy."""
    if not AMOY_RPC_URL:
        logger.warning("POLYGON_AMOY_RPC_URL not set — blockchain logging disabled.")
        return None
    try:
        w3 = Web3(Web3.HTTPProvider(AMOY_RPC_URL, request_kwargs={"timeout": 30}))
        # Polygon uses Proof-of-Authority — this middleware handles extra header fields
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        if not w3.is_connected():
            logger.warning("Could not connect to Polygon Amoy RPC — blockchain logging disabled.")
            return None
        return w3
    except Exception as e:
        logger.warning(f"Web3 init failed: {e} — blockchain logging disabled.")
        return None


def _load_contract(w3: Web3):
    """Loads the FloatChatAudit contract from local ABI + env address."""
    if not CONTRACT_ADDRESS:
        raise ValueError("FLOATCHAT_CONTRACT_ADDRESS not set in .env")
    if not _ABI_PATH.exists():
        raise FileNotFoundError(f"ABI not found at {_ABI_PATH}")
    with open(_ABI_PATH) as f:
        abi = json.load(f)
    checksum_addr = Web3.to_checksum_address(CONTRACT_ADDRESS)
    return w3.eth.contract(address=checksum_addr, abi=abi)


# ── Core Functions ─────────────────────────────────────────────────────────────

def compute_audit_hash(question: str, sql: str, result: list) -> str:
    """
    Deterministic SHA-256 hash of the query triple.
    Researchers can independently reproduce this hash to verify a TX.

    Format hashed: "<question><sql><json_sorted_result>"
    """
    result_json = json.dumps(result, sort_keys=True, default=str)
    payload = question + sql + result_json
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def log_to_chain(
    question: str,
    sql: str,
    result: list
) -> dict:
    """
    Asynchronously logs an audit record to Polygon Amoy.

    Returns a dict with:
      - audit_hash  : the SHA-256 hex string that was hashed
      - tx_hash     : the on-chain transaction hash (or None on failure)
      - polygonscan : clickable verification URL (or None)
      - error       : error message if something went wrong (or None)
    """
    audit_hash = compute_audit_hash(question, sql, result)

    # Always return the audit_hash — even if chain write fails
    base_response = {
        "audit_hash": f"sha256:{audit_hash}",
        "tx_hash": None,
        "polygonscan_url": None,
        "error": None,
    }

    # Validate config — fail gracefully if not set up
    if not all([CONTRACT_ADDRESS, WALLET_ADDRESS, PRIVATE_KEY]):
        base_response["error"] = "Blockchain env vars not configured — audit hash computed but not stored on-chain."
        logger.warning(base_response["error"])
        return base_response

    # Run the blocking web3 TX in a thread so it doesn't block FastAPI's event loop
    try:
        result_dict = await asyncio.get_event_loop().run_in_executor(
            None,
            _send_transaction,
            audit_hash
        )
        base_response.update(result_dict)
    except Exception as e:
        base_response["error"] = f"Chain write failed: {str(e)}"
        logger.error(base_response["error"])

    return base_response


def _send_transaction(audit_hash_hex: str) -> dict:
    """
    Blocking function: builds, signs, and sends the TX.
    Runs in a thread pool so it doesn't block the async event loop.
    """
    w3 = _build_web3()
    if not w3:
        return {"error": "Web3 connection unavailable.", "tx_hash": None, "polygonscan_url": None}

    contract = _load_contract(w3)

    # Convert hex string → bytes32 (what Solidity expects)
    hash_bytes = bytes.fromhex(audit_hash_hex)

    # Build the transaction
    wallet = Web3.to_checksum_address(WALLET_ADDRESS)
    nonce  = w3.eth.get_transaction_count(wallet)

    # Gas: first-time SSTORE (new storage slot) on Amoy costs ~150k-200k gas.
    # 300k gives comfortable headroom. At ~58 Gwei this is ~0.017 POL per TX.
    gas_price = int(w3.eth.gas_price * 1.2)  # 20% tip to get included faster

    tx = contract.functions.logQuery(hash_bytes).build_transaction({
        "from":     wallet,
        "nonce":    nonce,
        "gas":      300_000,
        "gasPrice": gas_price,
        "chainId":  80002,   # Polygon Amoy chain ID
    })

    # Sign with private key (stored securely in .env)
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)

    # Send
    tx_hash_bytes = w3.eth.send_raw_transaction(signed.raw_transaction)
    tx_hash = tx_hash_bytes.hex()

    # Wait for receipt (up to 60s) — confirms the TX mined
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=60)

    if receipt["status"] == 1:
        logger.info(f"✅ Audit logged on-chain: {tx_hash}")
        return {
            "tx_hash": tx_hash,
            "polygonscan_url": f"https://amoy.polygonscan.com/tx/{tx_hash}",
            "error": None,
        }
    else:
        return {
            "tx_hash": tx_hash,
            "polygonscan_url": f"https://amoy.polygonscan.com/tx/{tx_hash}",
            "error": "TX was mined but reverted — check contract.",
        }
