export default function LoadingScreen({ message = "กำลังโหลด..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-zinc-600">
      <div className="flex gap-1 mb-3">
        <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></span>
        <span className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
        <span className="w-3 h-3 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
