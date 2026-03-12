import { useEffect, useState } from 'react'
import ChatWindow from '../components/ChatWindow'
import OceanLoader from '../components/OceanLoader'
import Sidebar from '../components/Sidebar'
import UsernameModal from '../components/UsernameModal'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function ChatPage() {
    const { user } = useAuth()

    const [conversations, setConversations] = useState([])
    const [activeConvId, setActiveConvId] = useState(null)
    const [username, setUsername] = useState(null)
    const [profileLoading, setProfileLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (user) fetchProfile()
    }, [user])

    const fetchProfile = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

        setUsername(data?.username ?? null)
        setProfileLoading(false)
    }

    const handleUsernameSet = (name) => setUsername(name)
    const handleNewChat = () => setActiveConvId(null)

    if (profileLoading) {
        return <OceanLoader message="Loading your research space…" />
    }

    return (
        /* Chat layout: full viewport, no scroll — managed per-pane */
        <div className="flex h-screen w-screen overflow-hidden bg-background font-sans relative">

            {!username && <UsernameModal onComplete={handleUsernameSet} />}

            <Sidebar
                username={username}
                conversations={conversations}
                setConversations={setConversations}
                activeConvId={activeConvId}
                setActiveConvId={setActiveConvId}
                onNewChat={handleNewChat}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />

            <ChatWindow
                conversationId={activeConvId}
                setConversationId={setActiveConvId}
                conversations={conversations}
                setConversations={setConversations}
                onOpenSidebar={() => setSidebarOpen(true)}
            />
        </div>
    )
}
