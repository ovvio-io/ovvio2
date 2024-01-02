import { prettyJSON } from './common.ts';
import { ReadonlyJSONObject } from './interfaces.ts';

export function downloadJSON(fileName: string, json: ReadonlyJSONObject): void {
  const jsonString = prettyJSON(json);
  const url = window.URL.createObjectURL(
    new Blob([jsonString], { type: 'text/json' }),
  );
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  // the filename you want
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
