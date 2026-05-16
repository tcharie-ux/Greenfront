import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { AppModule } from './app/app-module';
import { App } from './app/components/app';

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(AppModule),
  ],
})
  .catch(err => console.error(err));
