/** What a user tells others about themselves, free of SDK types. */
export interface Profile {
  displayName: string;
  /** Where anyone can download the avatar image; absent until the user uploads one. */
  avatarUrl?: string;
}
