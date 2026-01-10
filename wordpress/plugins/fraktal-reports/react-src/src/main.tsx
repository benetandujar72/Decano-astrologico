import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Import components
import ReportGenerator from './components/ReportGeneration/ReportGenerator';
import UserDashboard from './components/UserDashboard/UserDashboard';
import PlanSelector from './components/PlanSelector/PlanSelector';

// Component registry
const components = {
  ReportGenerator,
  UserDashboard,
  PlanSelector,
};

// Find all containers with data-component attribute and render the appropriate component
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('[data-component]');

  containers.forEach((container) => {
    const componentName = container.getAttribute('data-component');
    const Component = components[componentName as keyof typeof components];

    if (Component) {
      // Extract props from data-attributes
      const props: any = {};
      Array.from(container.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && attr.name !== 'data-component') {
          // Convert data-plan-check to planCheck
          const propName = attr.name
            .replace('data-', '')
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          props[propName] = attr.value;
        }
      });

      const root = ReactDOM.createRoot(container);
      root.render(
        <React.StrictMode>
          <Component {...props} />
        </React.StrictMode>
      );
    } else {
      console.warn(`Component "${componentName}" not found in registry`);
    }
  });
});
