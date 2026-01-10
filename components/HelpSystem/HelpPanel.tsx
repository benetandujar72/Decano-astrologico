import React, { useState, useEffect } from 'react';
import { X, Search, Book, ChevronRight, AlertCircle, Lightbulb, Link as LinkIcon } from 'lucide-react';
import { HelpSection, HelpStep, HelpSearchResult } from '@/types/help';
import { helpSections, searchHelp, getContextualHelp } from '@/data/helpContent';
import HelpStepViewer from './HelpStepViewer';
import HelpSearchBar from './HelpSearchBar';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: string;
}

export default function HelpPanel({ isOpen, onClose, initialContext }: HelpPanelProps) {
  const [selectedSection, setSelectedSection] = useState<HelpSection | null>(null);
  const [selectedStep, setSelectedStep] = useState<HelpStep | null>(null);
  const [searchResults, setSearchResults] = useState<HelpSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen && initialContext) {
      const contextualHelp = getContextualHelp(initialContext);
      if (contextualHelp) {
        setSelectedSection(contextualHelp);
      }
    }
  }, [isOpen, initialContext]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setIsSearching(true);
      const results = searchHelp(query);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (result: HelpSearchResult) => {
    setSelectedSection(result.section);
    setSelectedStep(result.step);
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleBackToSections = () => {
    setSelectedStep(null);
    setSelectedSection(null);
  };

  const handleBackToSteps = () => {
    setSelectedStep(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Book className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Centro de Ayuda</h2>
              <p className="text-sm text-slate-400">
                {selectedStep
                  ? selectedStep.title
                  : selectedSection
                  ? selectedSection.title
                  : 'Guía completa de la aplicación'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-slate-700">
          <HelpSearchBar onSearch={handleSearch} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSearching ? (
            // Search Results
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white mb-4">
                Resultados de búsqueda ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No se encontraron resultados</p>
                </div>
              ) : (
                searchResults.map((result, index) => (
                  <button
                    key={`${result.section.id}-${result.step.id}-${index}`}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{result.section.icon}</span>
                          <span className="text-xs text-slate-500">{result.section.title}</span>
                        </div>
                        <h4 className="text-white font-medium mb-1">{result.step.title}</h4>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {result.step.description.slice(0, 150)}...
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : selectedStep ? (
            // Step Detail View
            <div>
              <button
                onClick={handleBackToSteps}
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Volver a {selectedSection?.title}</span>
              </button>
              <HelpStepViewer step={selectedStep} />
            </div>
          ) : selectedSection ? (
            // Steps List
            <div>
              <button
                onClick={handleBackToSections}
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Volver a todas las secciones</span>
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{selectedSection.icon}</span>
                  <h3 className="text-2xl font-semibold text-white">{selectedSection.title}</h3>
                </div>
                <p className="text-slate-400">{selectedSection.description}</p>
              </div>

              <div className="space-y-3">
                {selectedSection.steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStep(step)}
                    className="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <h4 className="text-white font-medium">{step.title}</h4>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2 ml-11">
                          {step.description.slice(0, 120)}...
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0 ml-2 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Sections Grid
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {helpSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  className="text-left p-6 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{section.icon}</span>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{section.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">{section.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {section.steps.length} pasos
                    </span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-indigo-400 capitalize">{section.category.replace('-', ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <AlertCircle className="w-4 h-4" />
              <span>¿No encuentras lo que buscas?</span>
            </div>
            <button className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Contactar soporte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
