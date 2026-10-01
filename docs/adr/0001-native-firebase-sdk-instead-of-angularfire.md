# Native Firebase SDK instead of AngularFire

The app uses the modular `firebase` JS SDK directly, behind a thin `provideFirebase()` provider and injection tokens, rather than `@angular/fire`. AngularFire typically lags behind new Angular major versions, and the Playground exists to adopt Angular updates quickly, so a third-party wrapper must not stand between us and `ng update`. We accept writing and maintaining our own small DI and signal glue in return.
