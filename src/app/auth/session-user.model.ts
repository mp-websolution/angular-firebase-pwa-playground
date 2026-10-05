/** The signed-in user, free of SDK types. */
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
