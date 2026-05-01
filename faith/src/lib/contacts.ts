const CONTACTS_KEY = 'faith_contacts';

export interface Contact {
  name: string;
  phone: string; // E.164 format preferred: +15551234567
  notes?: string;
}

export function getContacts(): Contact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Contact[];
  } catch {
    return [];
  }
}

export function saveContact(name: string, phone: string, notes?: string): void {
  if (typeof window === 'undefined') return;
  const contacts = getContacts();
  const existing = contacts.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
  // Normalize phone: strip non-digits then add +1 if US number
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.length === 10 ? `+1${digits}` : digits.startsWith('1') && digits.length === 11 ? `+${digits}` : phone;

  if (existing >= 0) {
    contacts[existing] = { name, phone: normalized, notes };
  } else {
    contacts.push({ name, phone: normalized, notes });
  }
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function findContact(nameOrPhone: string): Contact | undefined {
  const contacts = getContacts();
  const lower = nameOrPhone.toLowerCase().trim();
  return contacts.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.name.toLowerCase().includes(lower) ||
      c.phone.replace(/\D/g, '').includes(nameOrPhone.replace(/\D/g, ''))
  );
}

export function deleteContact(name: string): void {
  if (typeof window === 'undefined') return;
  const contacts = getContacts().filter((c) => c.name.toLowerCase() !== name.toLowerCase());
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

export function getContactsAsContext(): string {
  const contacts = getContacts();
  if (contacts.length === 0) return '';
  return contacts.map((c) => `- ${c.name}: ${c.phone}${c.notes ? ` (${c.notes})` : ''}`).join('\n');
}
