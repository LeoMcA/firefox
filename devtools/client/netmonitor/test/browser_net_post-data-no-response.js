/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests if the POST requests display the correct information in the UI,
 * for raw payloads with attached content-type headers.
 */
add_task(async function () {
  let finishRequest;
  const httpServer = setupServer(
    new Promise(res => {
      finishRequest = res;
    })
  );
  const port = httpServer.identity.primaryPort;
  const ORIGIN = `http://localhost:${port}`;
  const TEST_URL = `${ORIGIN}/null`;

  const { tab, monitor } = await initNetMonitor(ORIGIN, {
    requestCount: 1,
  });
  info("Starting test... ");

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  try {
    const waitForRequest = waitForDOM(document, ".request-list-item");
    SpecialPowers.spawn(tab.linkedBrowser, [TEST_URL], url => {
      const xhr = new content.XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send("foo=bar");
    });

    await waitForRequest
    EventUtils.sendMouseEvent(
      { type: "mousedown" },
      document.querySelectorAll(".request-list-item")[0]
    );

    const waitForPanel = waitForDOM(document, "#request-panel tr .treeLabelCell .treeLabel")
    clickOnSidebarTab(document, "request");

    await waitForPanel;
    const tabpanel = document.querySelector("#request-panel");

    is(
      tabpanel.querySelectorAll(".empty-notice").length,
      0,
      "The empty notice is not displayed in this tabpanel."
    );

    const labels = tabpanel.querySelectorAll("tr .treeLabelCell .treeLabel");
    const values = tabpanel.querySelectorAll("tr .treeValueCell .objectBox");

    is(labels[0].textContent, "foo", "The query param name is visible");
    is(values[0].textContent, `"bar"`, "The query param value is visible");
  } finally {
    finishRequest();
  }

  return teardown(monitor);
});

function setupServer(finishRequestPromise) {
  const httpServer = createTestHTTPServer();
  httpServer.registerContentType("html", "text/html");
  httpServer.registerPathHandler("/null", function (request, response) {
    response.processAsync();
    finishRequestPromise.then(() => response.finish());
  });
  return httpServer;
}
