import { ModelConfig } from "../components/ModelConfig";
import { AuthStatus } from "../components/AuthStatus";
import logo from "../assets/logo.svg";

export function App() {
  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 flex items-center justify-between border-b border-gray-200 pb-6">
          <div className="flex items-center gap-4">
            <img
              src={logo}
              alt="PromptLens"
              className="w-10 h-10 grayscale hover:grayscale-0 transition-all duration-300"
            />
            <h1 className="text-3xl font-bold text-black tracking-tight">
              PromptLens Settings
            </h1>
          </div>
          <AuthStatus />
        </header>

        <main className="space-y-8">
          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-xl font-bold tracking-tight text-black mb-6 uppercase text-sm tracking-widest font-mono text-gray-500">
              Model Configuration
            </h2>
            <ModelConfig />
          </section>

          <section className="bg-white border border-gray-200 p-8">
            <h2 className="text-xl font-bold tracking-tight text-black mb-6 uppercase text-sm tracking-widest font-mono text-gray-500">
              General Preferences
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Debounce Time (ms)
                </label>
                <input
                  type="number"
                  className="block w-full border border-gray-300 rounded-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm p-2 transition-colors duration-200"
                  defaultValue={500}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
