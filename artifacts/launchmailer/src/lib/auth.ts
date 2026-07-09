export function getToken(): string | null {
  return localStorage.getItem('launchmailer_token');
}

export function setToken(token: string): void {
  localStorage.setItem('launchmailer_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('launchmailer_token');
}
