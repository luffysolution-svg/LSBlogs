import assert from 'node:assert/strict';
import test from 'node:test';
import { addCopyButtons } from '../components/CopyableRichText';

test('adds one accessible copy button to every rendered code block', () => {
  const html = addCopyButtons('<pre class="code"><code>first</code></pre><p>body</p><pre><code>second</code></pre>');

  assert.equal((html.match(/data-code-copy/g) || []).length, 2);
  assert.equal((html.match(/aria-label="复制代码"/g) || []).length, 2);
  assert.match(html, /<pre class="code"><button[^>]+>复制<\/button><code>first<\/code><\/pre>/);
});
