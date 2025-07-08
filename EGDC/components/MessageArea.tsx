interface Message {
  text: string
  type: 'success' | 'error' | 'info'
}

interface MessageAreaProps {
  message: Message | null
}

export default function MessageArea({ message }: MessageAreaProps) {
  if (!message) {
    return <div className="my-4 text-center min-h-[40px]"></div>
  }

  const styles = {
    success: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200/70',
    error: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200/70',
    info: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200/70'
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  }

  return (
    <div className={`p-4 rounded-xl border shadow-lg ${styles[message.type]} transition-all duration-300 my-4 text-center font-medium backdrop-blur-sm`}>
      <span className="text-lg mr-2">{icons[message.type]}</span>
      {message.text}
    </div>
  )
} 