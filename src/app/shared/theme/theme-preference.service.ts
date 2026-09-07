import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import type {ThemeMode} from '../../home/presentation/presentation.contracts';

const THEME_STORAGE_KEY = 'arv-theme';

@Injectable({providedIn: 'root'})
export class ThemePreferenceService {
  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  load(): ThemeMode {
    const mode = this.read();
    this.apply(mode);
    return mode;
  }

  save(mode: ThemeMode): void {
    this.apply(mode);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable in private browsing or locked-down environments.
    }
  }

  private read(): ThemeMode {
    if (!isPlatformBrowser(this.platformId)) {
      return 'dark';
    }

    try {
      const storedMode = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return storedMode === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  private apply(mode: ThemeMode): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const root = this.document.documentElement;
    root.setAttribute('data-theme', mode);
    root.classList.toggle('arv-dark', mode === 'dark');
  }
}
