// Copyright 2018 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview hterm.AccessibilityReader unit tests.
 */
hterm.AccessibilityReader.Tests = new lib.TestManager.Suite(
    'hterm.AccessibilityReader.Tests');

/**
 * Clear out the current document and create a new hterm.AccessibilityReader
 * object for testing.
 *
 * Called before each test case in this suite.
 */
hterm.AccessibilityReader.Tests.prototype.preamble = function(result, cx) {
  const document = cx.window.document;

  document.body.innerHTML = '';

  const div = this.div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.height = '100%';
  div.style.width = '100%';

  this.accessibilityReader = new hterm.AccessibilityReader(div);
  this.accessibilityReader.setAccessibilityEnabled(true);
  this.liveElement = div.firstChild.firstChild;
  this.assertiveLiveElement = this.liveElement.nextSibling;

  document.body.appendChild(div);
};

/**
 * Test that printing text to the terminal will cause nodes to be added to the
 * live region for accessibility purposes. This shouldn't happen until after a
 * small delay has passed.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-live-region-single-delay', function(result, cx) {
  this.accessibilityReader.announce('Some test output');
  this.accessibilityReader.announce('Some other test output');
  this.accessibilityReader.newLine();
  this.accessibilityReader.announce('More output');

  result.assertEQ('', this.liveElement.getAttribute('aria-label'));

  const observer = new MutationObserver(() => {
    result.assertEQ('Some test output Some other test output\nMore output',
                    this.liveElement.getAttribute('aria-label'));
    observer.disconnect();
    result.pass();
  });

  observer.observe(this.liveElement, {attributes: true});
  // This should only need to be 2x the initial delay but we wait longer to
  // avoid flakiness.
  result.requestTime(500);
});


/**
 * Test that after text has been added to the live region, there is again a
 * delay before adding more text.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-live-region-double-delay', function(result, cx) {
  this.accessibilityReader.announce('Some test output');
  this.accessibilityReader.announce('Some other test output');
  this.accessibilityReader.newLine();
  this.accessibilityReader.announce('More output');

  result.assertEQ('', this.liveElement.getAttribute('aria-label'));

  const checkFirstAnnounce = () => {
    result.assertEQ('Some test output Some other test output\nMore output',
                    this.liveElement.getAttribute('aria-label'));

    this.accessibilityReader.announce('more text');
    this.accessibilityReader.newLine();
    this.accessibilityReader.announce('...and more');
    return true;
  };

  const checkSecondAnnounce = () => {
    result.assertEQ('more text\n...and more',
                    this.liveElement.getAttribute('aria-label'));
    return true;
  };

  const checksToComplete = [checkFirstAnnounce, checkSecondAnnounce];

  const observer = new MutationObserver(() => {
    if (checksToComplete[0]()) {
      checksToComplete.shift();
    }

    if (checksToComplete.length == 0) {
      observer.disconnect();
      result.pass();
    }
  });

  observer.observe(this.liveElement, {attributes: true});
  // This should only need to be 2x the initial delay but we wait longer to
  // avoid flakiness.
  result.requestTime(500);
});

/**
 * Test that adding the same text twice to the live region gets slightly
 * modified to trigger an attribute change.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-live-region-duplicate-text', function(result, cx) {
  this.accessibilityReader.announce('Some test output');

  result.assertEQ('', this.liveElement.getAttribute('aria-label'));

  const checkFirstAnnounce = () => {
    result.assertEQ('Some test output',
                    this.liveElement.getAttribute('aria-label'));

    this.accessibilityReader.announce('Some test output');
    return true;
  };

  const checkSecondAnnounce = () => {
    result.assertEQ('\nSome test output',
                    this.liveElement.getAttribute('aria-label'));
    return true;
  };

  const checksToComplete = [checkFirstAnnounce, checkSecondAnnounce];

  const observer = new MutationObserver(() => {
    if (checksToComplete[0]()) {
      checksToComplete.shift();
    }

    if (checksToComplete.length == 0) {
      observer.disconnect();
      result.pass();
    }
  });

  observer.observe(this.liveElement, {attributes: true});
  // This should only need to be 2x the initial delay but we wait longer to
  // avoid flakiness.
  result.requestTime(500);
});

/**
 * Test that adding text to the assertive live region works correctly.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-assertive-live-region', function(result, cx) {
  this.accessibilityReader.assertiveAnnounce('Some test output');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  'Some test output');
  this.accessibilityReader.clear();
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  '');
  result.pass();
});

/**
 * Test that adding the same text twice to the assertive live region gets
 * slightly modified to trigger an attribute change.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-assertive-live-region-duplicate-text', function(result, cx) {
  this.accessibilityReader.assertiveAnnounce('Some test output');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  'Some test output');
  this.accessibilityReader.assertiveAnnounce('Some test output');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  '\nSome test output');
  result.pass();
});

/**
 * Test that adding text to the assertive live region interrupts polite
 * announcements.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-assertive-live-region-interrupts-polite', function(result, cx) {
  this.accessibilityReader.announce('Some test output');
  this.accessibilityReader.announce('Some other test output');
  this.accessibilityReader.newLine();
  this.accessibilityReader.announce('More output');

  result.assertEQ(this.liveElement.getAttribute('aria-label'), '');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'), '');

  // The live element should not change because we interrupt it. It should only
  // announce the 'PASS' string which comes after all the output above.
  const observer = new MutationObserver(() => {
    if (this.liveElement.getAttribute('aria-label') == 'PASS') {
      result.pass();
    } else {
      result.assertEQ(this.liveElement.getAttribute('aria-label'), '');
    }
  });
  observer.observe(this.liveElement, {attributes: true});

  this.accessibilityReader.assertiveAnnounce('Some test output');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  'Some test output');

  this.accessibilityReader.announce('PASS');

  // Wait a time to ensure that nothing is announced from liveElement.
  result.requestTime(250);
});

/**
 * Test that nothing is announced when accessibility is disabled.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-disabled-enabled', function(result, cx) {
  this.accessibilityReader.setAccessibilityEnabled(false);
  this.accessibilityReader.announce('Some test output');
  this.accessibilityReader.announce('Some other test output');
  this.accessibilityReader.newLine();
  this.accessibilityReader.announce('More output');

  result.assertEQ(this.liveElement.getAttribute('aria-label'), '');

  // Only 'Other output' should be announced now.
  this.accessibilityReader.setAccessibilityEnabled(true);
  this.accessibilityReader.announce('Other output');

  const observer = new MutationObserver(() => {
    if (this.liveElement.getAttribute('aria-label') == 'Other output') {
      result.pass();
    } else {
      result.assertEQ(this.liveElement.getAttribute('aria-label'), '');
    }
  });
  observer.observe(this.liveElement, {attributes: true});

  result.requestTime(250);
});

/**
 * Test that when accessibility is disabled, nothing else will be announced.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-enabled-disabled', function(result, cx) {
  this.accessibilityReader.announce('Some test output');
  this.accessibilityReader.announce('Some other test output');
  this.accessibilityReader.newLine();
  this.accessibilityReader.announce('More output');

  result.assertEQ(this.liveElement.getAttribute('aria-label'), '');

  // The live element should not change because accessibility is disabled. It
  // should only announce the 'PASS' string which comes after all the output
  // above.
  const observer = new MutationObserver(() => {
    if (this.liveElement.getAttribute('aria-label') == 'PASS') {
      result.pass();
    } else {
      result.assertEQ(this.liveElement.getAttribute('aria-label'), '');
    }
  });
  observer.observe(this.liveElement, {attributes: true});

  this.accessibilityReader.setAccessibilityEnabled(false);

  this.accessibilityReader.setAccessibilityEnabled(true);
  this.accessibilityReader.announce('PASS');

  // Wait a time to ensure that nothing is announced from liveElement.
  result.requestTime(250);
});

/**
 * Test that when accessibility is disabled, assertive announcements still work.
 * These are not performance sensitive so they don't need to be gated on the
 * flag.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-assertive-disabled-enabled', function(result, cx) {
  this.accessibilityReader.setAccessibilityEnabled(false);

  this.accessibilityReader.assertiveAnnounce('Some test output');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  'Some test output');

  this.accessibilityReader.setAccessibilityEnabled(true);

  this.accessibilityReader.assertiveAnnounce('More test output');
  result.assertEQ(this.assertiveLiveElement.getAttribute('aria-label'),
                  'More test output');

  result.pass();
});

/**
 * Regression test for a bug that is caused by adding 2 newlines and then
 * calling announce. In this case an exception was thrown.
 */
hterm.AccessibilityReader.Tests.addTest(
    'a11y-newlines-then-announce', function(result, cx) {
  this.accessibilityReader.newLine();
  this.accessibilityReader.newLine();
  this.accessibilityReader.announce('Some test output');

  result.pass();
});
