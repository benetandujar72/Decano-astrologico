import React from 'react';
import { AlertCircle, Lightbulb, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { HelpStep } from '@/types/help';
import ReactMarkdown from 'react-markdown';

interface HelpStepViewerProps {
  step: HelpStep;
}

export default function HelpStepViewer({ step }: HelpStepViewerProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
      </div>

      {/* Screenshot/Image */}
      {step.image && (
        <div className="rounded-lg border border-slate-700 overflow-hidden bg-slate-800">
          <img
            src={step.image}
            alt={step.title}
            className="w-full h-auto"
            onError={(e) => {
              // Fallback if image doesn't exist
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="flex items-center justify-center h-48 bg-slate-800">
                    <div class="text-center">
                      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700 mb-3">
                        <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <p class="text-slate-500 text-sm">Captura de pantalla pendiente</p>
                    </div>
                  </div>
                `;
              }
            }}
          />
        </div>
      )}

      {/* Video */}
      {step.video && (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <video
            src={step.video}
            controls
            className="w-full h-auto bg-black"
          >
            Tu navegador no soporta videos.
          </video>
        </div>
      )}

      {/* Description */}
      <div className="prose prose-invert prose-slate max-w-none">
        <div className="text-slate-300 leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mb-3 mt-6" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-white mb-2 mt-5" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-white mb-2 mt-4" {...props} />,
              p: ({ node, ...props }) => <p className="mb-3 text-slate-300" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="text-slate-300" {...props} />,
              code: ({ node, inline, ...props }: any) =>
                inline ? (
                  <code className="px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded text-sm font-mono" {...props} />
                ) : (
                  <code className="block p-3 bg-slate-800 text-slate-300 rounded-lg text-sm font-mono overflow-x-auto mb-3" {...props} />
                ),
              strong: ({ node, ...props }) => <strong className="font-semibold text-white" {...props} />,
              a: ({ node, ...props }) => <a className="text-indigo-400 hover:text-indigo-300 underline" {...props} />,
            }}
          >
            {step.description}
          </ReactMarkdown>
        </div>
      </div>

      {/* Tips */}
      {step.tips && step.tips.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-amber-300 font-medium mb-2">💡 Consejos útiles</h4>
              <ul className="space-y-1.5">
                {step.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-amber-200/90">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {step.warnings && step.warnings.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-red-300 font-medium mb-2">⚠️ Advertencias</h4>
              <ul className="space-y-1.5">
                {step.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-red-200/90">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Related Steps */}
      {step.relatedSteps && step.relatedSteps.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-white font-medium mb-2">Temas relacionados</h4>
              <ul className="space-y-1.5">
                {step.relatedSteps.map((relatedId, index) => (
                  <li key={index}>
                    <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                      → {relatedId}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
