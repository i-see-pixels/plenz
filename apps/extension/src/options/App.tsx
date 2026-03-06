import { ModelConfig } from "../components/ModelConfig";
import { AuthStatus } from "../components/AuthStatus";
import logo from "../assets/logo.svg";

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="PromptLens" className="w-10 h-10" />
            <h1 className="text-3xl font-bold text-gray-900">
              PromptLens Settings
            </h1>
          </div>
          <AuthStatus />
        </header>

        <main className="space-y-6">
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Model Configuration</h2>
            <ModelConfig />
          </section>

          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">General Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Debounce Time (ms)
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
