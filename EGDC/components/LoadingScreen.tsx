interface LoadingScreenProps {
  text?: string
}

export default function LoadingScreen({ text = 'Cargando...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex justify-center items-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">{text}</p>
      </div>
    </div>
  )
} 