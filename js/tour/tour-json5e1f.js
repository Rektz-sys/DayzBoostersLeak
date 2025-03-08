/**
 * JSON Validator Page Tour
 */

'use strict';

(function () {
  // Function to set a cookie
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
  }

  // Function to get a cookie
  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.substring((name + '=').length);
      }
    }
    return null;
  }

  // Function to set up the tour steps
  function setupTour(tour) {
    const backBtnClass = 'btn btn-sm btn-label-secondary md-btn-flat waves-effect waves-light',
      nextBtnClass = 'btn btn-sm btn-primary btn-next waves-effect waves-light';

    // Step 1: JSON Editor
    tour.addStep({
      title: 'JSON Editor',
      text: 'This is the JSON editor where you can paste, upload, or edit your JSON content.',
      attachTo: { element: '#code_json', on: 'top' },
      buttons: [
        {
          text: 'Skip',
          classes: backBtnClass,
          action: tour.cancel,
        },
        {
          text: 'Next',
          classes: nextBtnClass,
          action: tour.next,
        },
      ],
    });

    // Step 2: Upload JSON File
    tour.addStep({
      title: 'Upload JSON File',
      text: 'Use this section to upload a JSON file for validation.',
      attachTo: { element: '#jsonFile', on: 'top' },
      buttons: [
        {
          text: 'Skip',
          classes: backBtnClass,
          action: tour.cancel,
        },
        {
          text: 'Next',
          classes: nextBtnClass,
          action: tour.next,
        },
      ],
    });

    // Step 3: Validation Actions
    tour.addStep({
      title: 'Validation Actions',
      text: 'These buttons allow you to validate, format, clear, or download your JSON content.',
      attachTo: { element: '.card-actions', on: 'left' },
      buttons: [
        {
          text: 'Skip',
          classes: backBtnClass,
          action: tour.cancel,
        },
        {
          text: 'Next',
          classes: nextBtnClass,
          action: tour.next,
        },
      ],
    });

    // Step 4: JSON Statistics
    tour.addStep({
      title: 'JSON Statistics',
      text: 'This panel shows statistics about your JSON file, such as file size, nesting depth, and total keys.',
      attachTo: { element: '.stats-container', on: 'left' },
      buttons: [
        {
          text: 'Skip',
          classes: backBtnClass,
          action: tour.cancel,
        },
        {
          text: 'Next',
          classes: nextBtnClass,
          action: tour.next,
        },
      ],
    });

    // Step 5: Structure Analysis
    tour.addStep({
      title: 'Structure Analysis',
      text: 'View the structure of your JSON in a tree format here.',
      attachTo: { element: '#jsonStructure', on: 'top' },
      buttons: [
        {
          text: 'Skip',
          classes: backBtnClass,
          action: tour.cancel,
        },
        {
          text: 'Finish',
          classes: nextBtnClass,
          action: tour.cancel,
        },
      ],
    });

    return tour;
  }

  // Automatically start the tour if no cookie is set
  document.addEventListener('DOMContentLoaded', function () {
    const tourShown = getCookie('jsonValidatorTourShown');
    if (!tourShown) {
      const tour = new Shepherd.Tour({
        defaultStepOptions: {
          scrollTo: false,
          cancelIcon: {
            enabled: true,
          },
        },
        useModalOverlay: true,
      });

      setupTour(tour).start();

      // Set a cookie to ensure the tour is only shown once
      setCookie('jsonValidatorTourShown', 'true', 30); // Cookie expires in 30 days
    }
  });
})();
