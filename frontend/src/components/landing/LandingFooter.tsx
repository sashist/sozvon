import { Send, Github } from 'lucide-react';

/**
 * Подвал лендинга — компактный, с описанием и соцсетями.
 */
export function LandingFooter() {
    return (
        <footer className="bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">СозвON</span>
                        <span className="hidden sm:inline text-sm text-slate-400">
                            — сервис для планирования онлайн-встреч
                        </span>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-3">
                            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-500 transition-colors">
                                <Send className="h-4 w-4" />
                            </a>
                            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-500 transition-colors">
                                <Github className="h-4 w-4" />
                            </a>
                        </div>
                        <span className="text-xs text-slate-300">
                            © {new Date().getFullYear()} СозвON
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
