# PX Mobile

An API that automatically generates PerimeterX mobile cookies 🤖.

# ⚙️ Setup

## 💻 Local

Make sure [`pnpm`](https://pnpm.io/installation) is installed.

```bash
cp .env.example .env
pnpm install
pnpm run build
pnpm run start
```

## 🚀 Deployment to [Fly.io](https://fly.io/)

```bash
flyctl create --name generate-api --no-deploy
flyctl secrets set API_SECRET=example
flyctl secrets set DATABASE_URL=example
flyctl secrets set AXIOM_TOKEN=example
flyctl deploy
fly scale count 2
```

# 🔨 Usage

Start the dev server using `pnpm run dev` and make a curl request to `http://localhost:3000/api/auth` to get started.
Alternatively, use `cli.ts` for local testing.

# 📚 Documentation

TODO

# 🧞 Commands

| Command                       | Action                                        |
|-------------------------------|-----------------------------------------------|
| `pnpm install`                | Installs dependencies                         |
| `pnpm run dev`                | Starts a local dev server at `localhost:3000` |
| `pnpm run build`              | Build for production to `./dist`              |
| `pnpm run start`              | Runs the built production files               |
| `pnpm run drizzle:generate`   | Generates Drizzle schema files                |
| `pnpm run drizzle:migrate`    | Runs Drizzle migrations                       |
| `pnpm run drizzle:push`       | Push Drizzle schema changes                   |
| `pnpm run lint`               | Run ESLint checking                           |
| `pnpm run prettier:check`     | Check for Prettier violations                 |
| `pnpm run prettier:format`    | Correct Prettier violations                   |

# 🔴 App Versions

| App Name                   | Bundle ID                          | App Version        | PX ID                            | SDK Version&emsp;&emsp;**▲** |
|----------------------------|------------------------------------|--------------------|----------------------------------|------------------------------|
| `Snipes` (USA)             | `com.shopgate.android.app22760`    | `5.46.0`           | `PX6XNN2xkk`                     | `1.13.1`                     |
| `solebox`                  | `com.solebox.raffleapp`            | `2.0.0`            | `PXuR63h57Z`                     | `1.13.2` (React)             |
| `Urban Outfitters`         | `com.urbanoutfitters.android`      | `2.60`             | `PX0N3XMOl0`                     | `1.13.2`                     |
| `Laybuy`                   | `com.laybuy.laybuy`                | `4.32.1`           | `PXN56PXeEB`                     | `1.13.2`                     |
| `FIVE GUYS`                | `com.fiveguys.olo.android`         | `5.1.1`            | `PXAOit9CN0`                     | `1.13.2`                     |
| `Sam's Club`               | `com.rfi.sams.android`             | `23.06.10`         | `PXkZ8ZZQmW` (dev: `PX8eeWmT9a`) | `1.13.4`                     |
| `GOAT`                     | `com.airgoat.goat`                 | `1.64.10`          | `PXmFvVqEj3` (dev: `PXp6KJReLE`) | `1.15.0`                     |
| `Hibbett &#124; City Gear` | `com.hibbett.android`              | `6.4.1`            | `PX9Qx3Rve4`                     | `1.15.2`                     |
| `StockX`                   | `com.stockx.stockx`                | `4.14.43`          | `PX16uD0kOF`                     | `1.15.2`                     | 
| `Chegg Study`              | `com.chegg`                        | `13.31.1`          | `PXaOtQIWNf`                     | `1.15.0`                     |
| `iHerb`                    | `com.iherb`                        | `9.6.0615`         | `PXVtidNbtC`                     | `1.16.5`                     |
| `TextNow`                  | `com.enflick.android.TextNow`      | `23.29.0.2`        | `PXK56WkC4O` (dev: `PXN4VzfSCm`) | `2.2.0`                      |
| `My B&BW`                  | `com.bathandbody.bbw`              | `5.4.1.29`         | `PXlsXlyYa5` (dev: `PXVmK4o7m2`) | `2.2.1`                      |
| `TVG`                      | `com.tvg`                          | `1.32.20230406-SL` | `PXYIkzMJ9m`                     | `2.1.1`                      |
| `SNIPES` (EU)              | `com.snipes`                       | `2.2.3`            | `PXszbF5p84`                     | `2.2.2` (React)              |
| `George`                   | `com.georgeatasda`                 | `1.0.134`          | `PXdoe5chT3`                     | `2.2.2`                      |
| `Walmart`                  | `com.walmart.android`              | `23.19`            | `PXUArm9B04`                     | `2.2.2`                      |
| `SSENSE`                   | `ssense.android.prod`              | `3.1.0`            | `PXQ7o93831`                     | `2.2.2`                      |
| `Vivid Seats`              | `com.vividseats.android`           | `2023.57.0`        | `PXIuDu56vJ` (`PXbj5OofE8`)      | `2.2.2`                      |
| `Zillow`                   | `com.zillow.android.zillowmap`     | `14.6.1.72135`     | `PXHYx10rg3` (+extras)           | `2.2.2`                      |
| `Grubhub`                  | `com.grubhub.android`              | `2023.22.1`        | `PXO97ybH4J`                     | `2.2.3`                      |
| `FanDuel Sportsbook`       | `com.fanduel.sportsbook`           | `1.73.0`           | `PXJMCVuBG8`                     | `2.2.3`                      |
| `Total Wine`               | `com.totalwine.app.store`          | `7.5.2`            | `PXFF0j69T5` (dev: `PX8d6Sr2bT`) | `3.0.2`                      |
| `Wayfair`                  | `com.wayfair.wayfair`              | `5.206`            | `PX3Vk96I6i` (dev: `PX1Iv8I1cE`) | `3.0.2`                      |
| `Priceline`                | `com.priceline.android.negotiator` | `7.6.264`          | `PX9aTjSd0n`                     | `3.0.3`                      |
| `Shiekh`                   | `com.shiekh.android`               | `10.16`            | `PXM2JHbdkv` (dev: `PXoHlvzT0p`) | `3.0.5`                      |

How to find app values:
1. App name: `resources.arsc/res/values/strings.xml` and search for:
   - `name="app_name"`
   - `application_name`
   - `android:label="` (`AndroidManifest.xml`)
2. Bundle ID: `BuildConfig.APPLICATION_ID`
3. App Version: `BuildConfig.VERSION_NAME`
4. PX ID: Search for:
   - `"PX[a-zA-Z0-9]{8}"` (enable regex)
   - `PX[a-zA-Z0-9]{8}</string>` (enable regex + resources)
   - `PerimeterX.INSTANCE.start` and xref the containing method
   - `"appId"`
   - Run app and view `/data/data/com.example.app/shared_prefs/com.perimeterx.mobile_sdk.PXxxxxxxxx.xml`
5. SDK Version: Search for:
   - `PerimeterX Android SDK`
   - `PX340` (SDK Version)
   - `String sdkVersion()`

New versions of the Mobile SDK can be downloaded [here](https://perimeterx.jfrog.io/ui/repos/tree/General/). [PX Android Docs](https://docs.perimeterx.com/docs/sdk-android).

# License

This project is completely proprietary and shouldn't be shared under any circumstance.