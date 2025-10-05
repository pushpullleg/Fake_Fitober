/**
 * Google Apps Script template: run on form submit to forward responses to an external DB/API.
 *
 * How to use:
 * 1. Open your Google Form or linked Spreadsheet.
 * 2. Open Extensions → Apps Script and create a new project (or paste this code).
 * 3. In Apps Script, set Script Properties (Project Settings → Script properties) for
 *    DB_ENDPOINT (the HTTPS endpoint) and optionally DB_AUTH (a token or API key).
 * 4. Deploy an installable trigger:
 *    - In Apps Script: Triggers (left) → Add Trigger
 *    - Choose function: onFormSubmit
 *    - Event source: From form (or From spreadsheet if you attach to the sheet)
 *    - Event type: On form submit
 *
 * Notes:
 * - Use e.namedValues to access question -> [answer] mapping.
 * - Apps Script has quotas and a 6-minute execution limit per invocation.
 * - Keep secrets in Script Properties (not hard-coded). For stronger security use
 *   Google Secret Manager or call a backend that holds credentials.
 */

function onFormSubmit(e) {
  // e.namedValues is the safest place to read question responses by title
  // Example shape: { "Team Member name": ["Mukesh"], "Activity": ["Walking"] }
  try {
    const named = e && e.namedValues ? e.namedValues : {};

    // Build a plain payload mapping question titles -> single string answers
    const payload = {};
    for (const key in named) {
      if (Object.prototype.hasOwnProperty.call(named, key)) {
        // named[key] is an array of values (to support multiple selections)
        payload[key] = Array.isArray(named[key]) ? named[key].join(', ') : named[key];
      }
    }

    // Add metadata
    payload._receivedAt = new Date().toISOString();
    payload._formId = (ScriptProperties && ScriptProperties.getProperty) ? ScriptProperties.getProperty('FORM_ID') : '';

    // Get endpoint and auth token from script properties
    const props = PropertiesService.getScriptProperties();
    const endpoint = props.getProperty('DB_ENDPOINT');
    const auth = props.getProperty('DB_AUTH'); // optional

    if (!endpoint) {
      Logger.log('No DB_ENDPOINT set in Script Properties. Skipping forward.');
      return;
    }

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    if (auth) {
      // Common patterns: Bearer token or API key header
      options.headers = { Authorization: 'Bearer ' + auth };
    }

    // POST to your database API / webhook
    const resp = UrlFetchApp.fetch(endpoint, options);
    const code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      Logger.log('Forwarded form response successfully: ' + code);
    } else {
      Logger.log('Forward failed: ' + code + ' - ' + resp.getContentText());
      // Optionally write error details to a sheet for later inspection
      writeForwardError(payload, code, resp.getContentText());
    }

  } catch (err) {
    // Catch and log script errors
    Logger.log('onFormSubmit error: ' + err);
    writeForwardError({ error: String(err), e: e }, 0, 'script-exception');
  }
}

function writeForwardError(payload, code, text) {
  try {
    const ssId = PropertiesService.getScriptProperties().getProperty('ERROR_SHEET_ID');
    if (!ssId) return;
    const ss = SpreadsheetApp.openById(ssId);
    const sh = ss.getSheetByName('forward_errors') || ss.insertSheet('forward_errors');
    sh.appendRow([new Date().toISOString(), code || '', JSON.stringify(payload).slice(0, 2000), String(text).slice(0,2000)]);
  } catch (e) {
    Logger.log('writeForwardError failed: ' + e);
  }
}

/**
 * Small helper to set script properties programmatically (run once in editor with proper values)
 * Example usage (run from Apps Script editor): setScriptProperties('https://example.com/webhook','myApiKey','yourFormId','sheetIdIfYouWantErrors');
 */
function setScriptProperties(endpoint, auth, formId, errorSheetId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('DB_ENDPOINT', endpoint || '');
  if (auth) props.setProperty('DB_AUTH', auth);
  if (formId) props.setProperty('FORM_ID', formId);
  if (errorSheetId) props.setProperty('ERROR_SHEET_ID', errorSheetId);
}
