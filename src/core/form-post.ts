/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormQuestion, parseFormPage } from './form-page';

/**
 * Handing a submission in from the desktop app, and being told whether it
 * arrived.
 *
 * In a browser this cannot be done: a page may post to another site but may
 * not read what comes back, so the student would be told "sent" whatever
 * happened. The browser build therefore posts into a frame and lets the
 * student read Google's own answer with their own eyes. The desktop build has
 * no such rule — the request goes through Rust — so here the answer is read
 * and turned into a verdict.
 *
 * The verdict is structural, not a phrase: a form that refused a submission
 * renders itself again, questions and all, while a form that recorded one
 * returns a page with no questions on it. That holds in every language the
 * form might be in, which a search for "your response has been recorded"
 * would not.
 */

export const onDesktop = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type PostOutcome =
  /** The form took it. */
  | { state: 'recorded' }
  /** The form handed itself back: something it insists on is not filled in. */
  | { state: 'refused'; missing: FormQuestion[] }
  /** Nothing was reached — no network, or the address is wrong. */
  | { state: 'failed'; message: string };

/** The desktop HTTP client, loaded only where it exists. */
async function desktopFetch(): Promise<typeof fetch> {
  const plugin = await import('@tauri-apps/plugin-http');
  return plugin.fetch as unknown as typeof fetch;
}

/** A form's published page, for reading its questions. Desktop only. */
export async function fetchFormPage(url: string): Promise<string | null> {
  if (!onDesktop()) return null;
  try {
    const request = await desktopFetch();
    const response = await request(url, { method: 'GET' });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/** Hands a submission to the form and reads what the form made of it. */
export async function postSubmission(responseUrl: string, fields: [string, string][]): Promise<PostOutcome> {
  if (!onDesktop()) return { state: 'failed', message: 'desktop' };

  const body = new URLSearchParams();
  for (const [name, value] of fields) body.append(name, value);

  let text: string;
  try {
    const request = await desktopFetch();
    const response = await request(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    text = await response.text();
  } catch (e) {
    return { state: 'failed', message: e instanceof Error ? e.message : String(e) };
  }

  const questions = parseFormPage(text);
  if (!questions.length) return { state: 'recorded' };

  // The form came back. Whatever it insists on and we did not send is why.
  const sent = new Set(fields.filter(([, value]) => value !== '').map(([name]) => name));
  return { state: 'refused', missing: questions.filter((q) => q.required && !sent.has(q.entry)) };
}
