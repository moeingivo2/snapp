import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { UserProfile } from './models';

const TOKEN_KEY = 'snapp_token';
const PROFILES_KEY = 'snapp_profiles';

interface VerifyResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(this.readToken());
  readonly profile = signal<UserProfile | null>(this.readProfile());

  readonly accessToken = this.token.asReadonly();
  readonly isLoggedIn = computed(() => this.token() !== null);
  readonly currentPhone = computed(() => {
    const token = this.token();
    return token?.startsWith('fake-token-') ? token.slice('fake-token-'.length) : '';
  });

  requestOtp(phone: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/otp`, { phone });
  }

  verifyOtp(phone: string, code: string): Observable<void> {
    return this.http
      .post<VerifyResponse>(`${environment.apiUrl}/auth/verify`, { phone, code })
      .pipe(
        tap((res) => this.saveToken(res.token)),
        map(() => undefined),
      );
  }

  loadProfile(phone: string): UserProfile | null {
    try {
      const profiles = this.readProfiles();
      let profile = profiles[phone] ?? null;
      if (!profile) {
        const legacy = JSON.parse(localStorage.getItem('snapp_passenger_profile') ?? 'null') as
          | { firstName?: string; lastName?: string }
          | null;
        if (legacy?.firstName && legacy.lastName) {
          profile = { firstName: legacy.firstName, lastName: legacy.lastName, phone, role: 'passenger' };
          this.saveProfile(profile);
        }
      }
      this.profile.set(profile);
      return profile;
    } catch {
      this.profile.set(null);
      return null;
    }
  }

  saveProfile(profile: UserProfile): void {
    try {
      const profiles = this.readProfiles();
      profiles[profile.phone] = profile;
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      this.profile.set(profile);
    } catch {
      throw new Error('PROFILE_STORAGE_FAILED');
    }
  }

  logout(): void {
    this.token.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }


  private readToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private readProfiles(): Record<string, UserProfile> {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '{}') as Record<string, UserProfile>;
    } catch {
      return {};
    }
  }

  private readProfile(): UserProfile | null {
    const token = this.readToken();
    const phone = token?.startsWith('fake-token-') ? token.slice('fake-token-'.length) : '';
    if (!phone) return null;
    return this.readProfiles()[phone] ?? null;
  }


  private saveToken(value: string): void {
    this.token.set(value);
    try {
      localStorage.setItem(TOKEN_KEY, value);
    } catch {}
  }
}
