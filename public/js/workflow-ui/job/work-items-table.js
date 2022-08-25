import { formatDates } from "../table.js";

/**
 * Query the Harmony backend for an up to date version of 
 * a single HTML page of the work items table.
 * @param {string} jobId - id of the job that the work items are linked to
 * @param {number} page - page number for the work items
 * @param {number} limit - limit on the number of work items in a page
 * @param {boolean} checkJobStatus - set to true if should check whether the job is finished
 * @returns Boolean indicating whether the job is still running. 
 */
async function load(jobId, page, limit, checkJobStatus) {
  const filterInput = document.querySelector('input[name="tableFilter"]');
  const disallowStatus = document.querySelector('input[name="disallowStatus"]').checked ? 'on': '';
  let tableUrl = `./${jobId}/work-items?page=${page}&limit=${limit}&checkJobStatus=${checkJobStatus}`;
  if (filterInput) {
    tableUrl += `&tableFilter=${encodeURIComponent(filterInput.value)}&disallowStatus=${disallowStatus}`;
  }
  const res = await fetch(tableUrl);
  if (res.status === 200) {
    const template = await res.text();
    document.getElementById('workflow-items-table-container').innerHTML = template;
    formatDates();
    return true;
  } else {
    return false;
  }
}

/**
 * Query the Harmony backend for an up to date version of 
 * a single HTML page of the work items table, then publish the table loaded event.
 * @param {string} jobId - id of the job that the work items are linked to
 * @param {number} page - page number for the work items
 * @param {number} limit - limit on the number of work items in a page
 * @param {boolean} checkJobStatus - set to true if should check whether the job is finished
 * @param {object} broker - pubsub broker
 * @returns Boolean indicating whether the job is still running. 
 */
async function loadAndNotify(jobId, page, limit, checkJobStatus, broker) {
  const stillRunning = await load(jobId, page, limit, checkJobStatus);
  broker.publish('work-items-table-loaded');
  return stillRunning;
}

/**
 * Build the work items filter (for filtering by 'status').
 */
 function initFilter() {
  var filterInput = document.querySelector('input[name="tableFilter"]');
  const allowedList = [
    { value: 'status: ready', dbValue: 'ready', field: 'status'},
    { value: 'status: successful', dbValue: 'successful', field: 'status'},
    { value: 'status: canceled', dbValue: "canceled", field: 'status'},
    { value: 'status: running', dbValue: "running", field: 'status'},
    { value: 'status: failed', dbValue: "failed", field: 'status'},
  ];
  const allowedValues = allowedList.map(t => t.value);
  new Tagify(filterInput, {
    whitelist: allowedList,
    validate: function (tag) {
      if (allowedValues.includes(tag.value)) {
        return true;
      }
      return false;
    },
    editTags: false,
    maxTags: 30,
    dropdown: {
      maxItems: 15,
      enabled: 0,
      closeOnSelect: true
    }
  })
}

/**
 * Utility for initializing and refreshing a single page of the work items table.
 * After calling init, work item information will be fetched periodically
 * so that the user can see updates in near real time.
 */
export default {

  /**
   * Update the work items table while the job is processing.
   * @param {string} jobId - id of the job that the work items are linked to
   * @param {number} page - page number for the work items
   * @param {number} limit - limit on the number of work items in a page
   * @param {object} broker - pubsub broker
   */
  async init(jobId, page, limit, broker) {
    initFilter();
    broker.subscribe( // reload when the user changes the job's state
      'job-state-change',
      async function () {
        loadAndNotify(jobId, page, limit, false, broker);
      }
    );
    // do an initial table load immediately
    let jobIsRunning = await loadAndNotify(jobId, page, limit, false, broker);
    // reload the table every 5 seconds until the job is almost done
    const fiveSeconds = 5 * 1000;
    while (jobIsRunning) {
      await new Promise(res => setTimeout(res, fiveSeconds));
      jobIsRunning = await loadAndNotify(jobId, page, limit, true, broker);
    }
    // reload the table one last time
    loadAndNotify(jobId, page, limit, false, broker)
  },
}