/* Interactive, source-grounded overview of the three public engineering case studies.
 * The dedicated project pages contain the full engineering analyses.
 * No measurements are synthesized or fetched at runtime.
 */
(() => {
  'use strict';
  const explorer = document.getElementById('case-explorer');
  if (!explorer) return;

  const caseData = {
    nasa: {
      label: 'NASA robotic-arm assessment',
      title: 'A robotic arm operating under vacuum constraints',
      status: 'Engineering assessment',
      intro: 'Follow the constraint review, two engineering workstreams, and verification planning. These stages describe the project work, not a completed vacuum qualification.',
      steps: [
        {
          name: 'Constraints', note: 'Geometry + environment',
          title: 'Define the workspace and environmental constraints',
          body: 'Review test surfaces, reachable workspace, joint and actuator limits, and the high-vacuum environment before selecting a control or thermal model.',
          limit: 'The assessment specifies a 10⁻⁷ torr vacuum target. This is an operating requirement, not evidence of qualified operation.'
        },
        {
          name: 'Arm control', note: 'ROS2 + calibration',
          title: 'Control and calibrate the robotic arm',
          body: 'ROS2 was used for arm control and calibration as part of the NASA assessment. Calibration and workspace checks inform whether the proposed motions are feasible.',
          limit: 'Control and calibration work were performed, but quantitative calibration error and a validated operating envelope are not publicly reported.'
        },
        {
          name: 'Thermal model', note: 'Thermal Desktop',
          title: 'Examine steady-state and transient behavior',
          body: 'Thermal Desktop supported steady-state and transient analysis of the arm in the high-vacuum environment, complementing the mechanical and control assessment.',
          limit: 'The project records describe the modeling work, not public temperature histories or demonstrated thermal margins.'
        },
        {
          name: 'Verification', note: 'Requirements + scenarios',
          title: 'Trace the assessment to verification needs',
          body: 'The assessment covers 34 system requirements and six planned test scenarios, providing structure for evaluating readiness and identifying missing evidence.',
          limit: 'The six scenarios were planned. They are not six completed qualification tests, and vacuum qualification was not established.'
        }
      ],
      metrics: [['34','requirements in scope'],['6','planned scenarios'],['10⁻⁷ torr','vacuum target']],
      anchor: 'projects/nasa.html#project-evidence', href: 'projects/nasa.html'
    },
    iverify: {
      label: 'IVerify capstone prototype',
      title: 'From tubing force to an electrical indication',
      status: 'Bench-level proof of concept',
      intro: 'Explore the proposed external sensing path and the limited bench observations. This student device was not validated for clinical decisions.',
      steps: [
        {
          name: 'Clamp', note: 'External tubing contact',
          title: 'Establish controlled preload without fluid contact',
          body: 'A clip-on clamp acts on the outside of the tubing. Repeated bench trials reported an average preload near 5.0 N within approximately ±10% of the target.',
          limit: 'The clamp trials were preliminary bench tests on selected tubing, not validated performance across clinical tubing and conditions.'
        },
        {
          name: 'Sensor', note: 'Force response',
          title: 'Convert tubing reaction force to an electrical signal',
          body: 'The project’s sensing concept uses changes in external tubing reaction force as its input; reported tests observed sensor-output changes under altered conditions.',
          limit: 'Quantitative flow sensitivity, false-alarm performance, and detection-time distributions were not established.'
        },
        {
          name: 'Comparison', note: 'Condition + threshold',
          title: 'Interpret the signal against candidate thresholds',
          body: 'Signal conditioning and comparator thresholds were exercised in the student prototype before the microcontroller supervised the indication state.',
          limit: 'Bench threshold response is not proof of reliable occlusion detection or of medically safe thresholds.'
        },
        {
          name: 'Indication', note: 'MCU + two LEDs',
          title: 'Present the prototype state to a viewer',
          body: 'The microcontroller and two LEDs were demonstrated as the prototype output. A three-color indication scheme remained a later design goal.',
          limit: 'The two-LED demonstration was not clinically validated; the three-color concept must not be described as implemented in the original prototype.'
        }
      ],
      metrics: [['≈5.0 N','reported bench preload'],['≈±10%','reported deviation'],['2 LEDs','demonstrated indication']],
      anchor: 'projects/iverify.html#project-evidence', href: 'projects/iverify.html'
    },
    controls: {
      label: 'Strain-gauge measurement lab',
      title: 'From a vibrating metal strip to a measured waveform',
      status: 'Recorded bench observations',
      intro: 'Follow the half-bridge measurement chain and see why the selected clean trace cannot stand in for an uncertainty study across trials.',
      steps: [
        {
          name: 'Excitation', note: 'Metal strip',
          title: 'Apply a load and excite the specimen',
          body: 'The partner lab used mechanical loading and excitation of a metal strip, then observed the response as the specimen vibrated.',
          limit: 'The recorded values are for a selected cleaner strummed trace; other attempted traces were noisier.'
        },
        {
          name: 'Strain sensor', note: 'Half-bridge',
          title: 'Translate beam strain into resistance changes',
          body: 'A half-bridge strain-gauge arrangement captured small resistance changes produced by the strip’s deformation.',
          limit: 'The project does not provide certified strain-gauge performance or complete measurement uncertainty.'
        },
        {
          name: 'Calibration', note: 'Validyne CD12',
          title: 'Balance and condition the weak sensor signal',
          body: 'A Validyne CD12 transducer indicator was balanced and calibrated for the experiment before the conditioned output was inspected.',
          limit: 'The calibration procedure was documented, but uncertainty and repeatability statistics were not reported.'
        },
        {
          name: 'Oscilloscope', note: 'Selected waveform',
          title: 'Read frequency, amplitude, and reported decay',
          body: 'The selected cleaner oscilloscope trace was reported at 49.256 Hz with a 610 mV peak and a 6.335 ms decay time constant.',
          limit: 'These are selected-trace measurements, not averaged results or a certified characterization of the sensor or specimen.'
        }
      ],
      metrics: [['49.256 Hz','selected trace frequency'],['610 mV','selected peak output'],['6.335 ms','reported decay constant']],
      anchor: 'projects/controls.html#project-evidence', href: 'projects/controls.html'
    }
  };

  const tabs = [...explorer.querySelectorAll('[data-case-select]')];
  const nodes = [...explorer.querySelectorAll('[data-case-step]')];
  const panel = document.getElementById('case-explorer-panel');
  const headline = document.getElementById('case-explorer-title');
  const summary = document.getElementById('case-explorer-summary');
  const badge = document.getElementById('case-explorer-status');
  const insightHeading = document.getElementById('case-explorer-step-title');
  const insightText = document.getElementById('case-explorer-step-text');
  const limitText = document.getElementById('case-explorer-limit-text');
  const counter = document.getElementById('case-explorer-counter');
  const metrics = [...explorer.querySelectorAll('[data-case-metric]')];
  const detailsLink = document.getElementById('case-explorer-details');
  const fullLink = document.getElementById('case-explorer-full');
  const prev = document.getElementById('case-explorer-prev');
  const next = document.getElementById('case-explorer-next');
  if (!tabs.length || nodes.length !== 4 || metrics.length !== 3 ||
      !panel || !headline || !summary || !badge || !insightHeading ||
      !insightText || !limitText || !counter || !detailsLink || !fullLink ||
      !prev || !next) return;

  let selected = 'nasa';
  let step = 0;

  function renderCase(){
    const data = caseData[selected];
    const state = data.steps[step];
    const activeTab = tabs.find(tab => tab.dataset.caseSelect === selected);
    tabs.forEach(tab => {
      const on = tab === activeTab;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', activeTab.id);
    headline.textContent = data.title;
    summary.textContent = data.intro;
    badge.textContent = data.status;
    nodes.forEach((node, i) => {
      const phase = data.steps[i];
      const isActive = i === step;
      node.setAttribute('aria-pressed', String(isActive));
      node.setAttribute('aria-label', 'Step ' + (i + 1) + ' of 4: ' + phase.name);
      node.querySelector('strong').textContent = phase.name;
      node.querySelector('small').textContent = phase.note;
    });
    insightHeading.textContent = state.title;
    insightText.textContent = state.body;
    limitText.textContent = state.limit;
    counter.textContent = (step + 1) + ' / 4';
    metrics.forEach((metric, i) => {
      metric.querySelector('strong').textContent = data.metrics[i][0];
      metric.querySelector('span').textContent = data.metrics[i][1];
    });
    detailsLink.href = data.anchor;
    fullLink.href = data.href;
    fullLink.setAttribute('aria-label', 'Read full project details for ' + data.label);
  }

  function showCase(which, focusTab = false){
    if (!Object.hasOwn(caseData, which)) return;
    selected = which;
    step = 0;
    renderCase();
    if (focusTab) tabs.find(tab => tab.dataset.caseSelect === which)?.focus();
  }
  function showStep(nextStep, focusStep = false){
    step = (nextStep + 4) % 4;
    renderCase();
    if (focusStep) nodes[step].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => showCase(tab.dataset.caseSelect));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      let index = i;
      if(event.key === 'Home') index = 0;
      else if(event.key === 'End') index = tabs.length - 1;
      else index = (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      showCase(tabs[index].dataset.caseSelect, true);
    });
  });
  nodes.forEach((node, index) => {
    node.addEventListener('click', () => showStep(index));
    node.addEventListener('keydown', event => {
      if(event.key === 'ArrowRight' || event.key === 'ArrowLeft'){
        event.preventDefault();
        showStep(index + (event.key === 'ArrowRight' ? 1 : -1), true);
      }
    });
  });
  prev.addEventListener('click', () => showStep(step - 1));
  next.addEventListener('click', () => showStep(step + 1));

  // Keep older case-study deep links working by selecting the matching explorer tab.
  const linkedCases = {
    '#case-nasa':'nasa', '#case-iverify':'iverify', '#case-controls':'controls'
  };
  const linkedCase = linkedCases[window.location.hash];
  if (linkedCase) selected = linkedCase;
  renderCase();
  explorer.hidden = false;
  window.addEventListener('hashchange', () => {
    const target = linkedCases[window.location.hash];
    if (target) showCase(target);
  });
})();
