export const sender = 'astonajoy77@gmail.com';
export function base64url(value: string) {
 const bytes = new TextEncoder().encode(value);
 return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function makeRaw(to:string, subject:string, body:string) {
 if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to) || /[\r\n]/.test(subject)) throw new Error('Invalid email headers');
 const encodedSubject=btoa(Array.from(new TextEncoder().encode(subject),b=>String.fromCharCode(b)).join(''));
 const encodedBody=btoa(Array.from(new TextEncoder().encode(body),b=>String.fromCharCode(b)).join('')).match(/.{1,76}/g)!.join('\r\n');
 return base64url(`From: Aston Rodrigues <${sender}>\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${encodedSubject}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encodedBody}`);
}
