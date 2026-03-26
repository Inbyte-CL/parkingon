# Nexgo N96 – Referencia SDK SmartPOS (SmartPos API 3.08.002)

Documento de referencia para desarrollo en **Nexgo N96** usando el SDK **Nexgo SmartPOS API 3.08.002**. Incluye flujo de uso, clases principales, hardware específico del N96 y códigos de retorno.

---

## 1. Dispositivo Nexgo N96

- **Modelo:** N96 (POS Android).
- **Compatibilidad SDK:** Documento y SDK indican compatibilidad con **N96, N82, N6 (Android 10)** (V3.07.001).
- **Hardware específico N96:**
  - **DECORATIVE_LIGHT:** LED decorativo exclusivo del N96 (`LightModeEnum.DECORATIVE_LIGHT` en la clase LED).
- **Serial:** Para N6 (Android 10) countertop, `portNo = 0` al obtener el driver serie.

---

## 2. Integración del SDK

### 2.1 Contenido del SDK

- **Paquete AAR:** `nexgo-smartpos-sdk-v3.08.002_20240410.aar` (o equivalente `nexgo-smart-sdk-vx.x.x.aar`).
- **Package name (código real en JAR):** `com.nexgo.oaf.apiv3` (APIProxy, DeviceEngine) y `com.nexgo.oaf.apiv3.device.printer` (Printer, AlignEnum).
- **Versión:** 3.08.002 (versionName), versionCode 6.
- **minSdkVersion:** 19 | **targetSdkVersion:** 25 (en el manifest del AAR).
- **Arquitecturas nativas:** `arm64-v8a`, `armeabi-v7a` (libs EMV, cards, gencode, etc.).
- **Dependencias en el AAR:** `decoder.jar`, `nexgoSystemService_sdk_7.1_20201207.jar`.

### 2.2 Cómo crear el proyecto (Android Studio)

1. Crear o abrir el proyecto.
2. Copiar el AAR a `libs/` y en `build.gradle`:

```gradle
repositories {
    flatDir {
        dirs 'libs'
    }
}
dependencies {
    implementation(name: 'nexgo-smartpos-sdk-v3.08.002_20240410', ext: 'aar')
}
```

3. Obtener el motor de dispositivo (patrón global):

```java
DeviceEngine deviceEngine = APIProxy.getDeviceEngine(this);
```

4. A partir de `deviceEngine` se obtienen los submódulos (impresora, escáner, LED, etc.) y se llaman sus métodos.

---

## 3. Punto de entrada: APIProxy y DeviceEngine

- **APIProxy.getDeviceEngine(Context):** devuelve el singleton `DeviceEngine` para acceder a todo el hardware.
- No hay un `init()` explícito del SDK documentado; el uso típico es obtener `DeviceEngine` y luego el módulo que se necesite (Printer, Scanner, LED, etc.).

Módulos obtenidos desde `DeviceEngine` (resumen):

| Módulo            | Método típico                 | Uso principal              |
|-------------------|--------------------------------|-----------------------------|
| LED               | `getLEDDriver()`               | Luces (incl. DECORATIVE_LIGHT en N96) |
| Printer           | `getPrinter()`                 | Impresión térmica          |
| Scanner           | `getScanner()`                 | Escáner cámara (UI por defecto) |
| Scanner 2         | `getScanner2()`                | Escáner con UI personalizable |
| Pinpad            | (vía otro flujo)               | Teclado seguro, PIN, cifrado |
| MagCard           | (reader)                       | Banda magnética            |
| ICCard            | (reader)                       | Chip contacto               |
| RFCard / CardReader | (reader)                     | Contactless                 |
| EmvHandler / EmvHandler2 | (EMV)                    | Flujo EMV                  |
| Beeper            | `getBeeper()`                  | Beep                        |
| Platform          | `getPlatform()`                | Instalar/desinstalar APK, reinicio, firmware |
| DeviceInfo        | (desde engine/context)         | SN, modelo, firmware        |
| Serial            | `getSerialPortDriver(int portNo)` | Puerto serie            |
| UsbSerial         | `getUsbSerial()`               | USB serie (cable Nexgo)     |

---

## 4. Clases y métodos por hardware

### 4.1 LED (incl. N96 DECORATIVE_LIGHT)

- **Objeto:** `LEDDriver ledDriver = deviceEngine.getLEDDriver();`
- **Método:** `setLed(LightModeEnum light, boolean isOn);`
- **LightModeEnum:** `RED`, `GREEN`, `YELLOW`, `BLUE`, **`DECORATIVE_LIGHT`** (solo N96).

```java
ledDriver.setLed(LightModeEnum.DECORATIVE_LIGHT, true);  // N96 only
ledDriver.setLed(LightModeEnum.GREEN, false);
```

---

### 4.2 Printer

- **Objeto:** `Printer printer = deviceEngine.getPrinter();`
- **Flujo recomendado:** initPrinter → getStatus (comprobar papel) → setLetterSpacing/setGray/setTypeface (opcional) → append* → feedPaper/cutPaper → startPrint.

Métodos principales:

| Método | Descripción |
|--------|-------------|
| `initPrinter()` | Inicializar impresora. Retorno: `SdkResult.Success` |
| `getStatus()` | Estado: Success, Printer_UnFinished, Printer_PaperLack, Printer_TooHot, Printer_Fault, Fail |
| `appendImage(Bitmap bitmap, AlignEnum align)` | Añadir imagen |
| `appendPrnStr(String str, ...)` | Variantes para texto (tamaño, alineación, negrita) |
| `appendPrnStr(String leftText, String rightText, int fontsize, LineOptionEntity ops)` | Línea izquierda/derecha |
| `appendBarcode(String content, int height, int margin, int scale, BarcodeFormatEnum, AlignEnum align)` | Código de barras |
| `appendQRcode(String content, int height, AlignEnum align)` | QR |
| `feedPaper(int value)` | value = longitud en píxeles (≥0), 0 = por defecto |
| `cutPaper()` | Cortar papel |
| `startPrint(boolean rollPaperEnd, OnPrintListener listener)` | Imprimir; listener para fin de impresión |
| `setLetterSpacing(int value)` | Espacio entre líneas (píxeles), default 4 |
| `setGray(GrayLevelEnum level)` | Nivel de gris (LEVEL_0, LEVEL_1, LEVEL_2...) |
| `setTypeface(Typeface typeface)` | Tipo de letra |

**Alineación:** `AlignEnum.LEFT`, `RIGHT`, `CENTER`.  
**Tamaños de fuente:** small 16, normal 20, large 24, x-large 32.

---

### 4.3 Scanner (cámara)

Dos variantes:

- **Scanner #1 (UI por defecto):** `Scanner scanner = deviceEngine.getScanner();`
- **Scanner #2 (UI personalizable):** `Scanner scanner = deviceEngine.getScanner2();`

Scanner #1:

- `initScanner(ScannerCfgEntity cfgEntity, OnScannerListener listener);`
- `startScan(int timeout, OnScannerListener listener);` — timeout en segundos (recomendado 60).
- `stopScan();`
- `decode(byte[] imageData, int imageWidth, int imageHeight);` — entrada YUV420SP.

**ScannerCfgEntity (resumen):**  
`isUsedFrontCcd`, `isBulkMode`, `interval` (ms), `isAutoFocus`, `isNeedPreview`, `symbolEnumList` (tipos de código), `mBundle` para personalizar UI (showBar, showBack, showTitle, showSwitch, showMenu, Title, TitleSize, ScanTip, TipSize, **hideFram** — ocultar caja de previsualización, requiere firmware reciente).

Scanner #2:

- `initScanner(ScannerCfgEntity cfgEntity, Set<SymbolEnum> enableSymbols);`
- `getBestPreviewSize();` → `Size`
- Luego se usa con vistas propias y callbacks.

---

### 4.4 Beeper

- **Objeto:** `Beeper beeper = deviceEngine.getBeeper();`
- **Método:** `beep(int durationMs);` — por ejemplo `beeper.beep(500);`

---

### 4.5 DeviceInfo

- **Método (desde contexto/engine):** `DeviceInfo getDeviceInfo();`
- **DeviceInfo:** `sn`, `ksn`, `model` (ej. N5), `osVer`, `sdkVer`, `firmWareVer`, `kernelVer`, `vendor` (ej. Nexgo), `firmWareFullVersion`, `emvKernelVersionInfo`, `spCoreVersion`, `spBootVersion` (chip seguro). Para N96/N82/N6 el modelo y la versión de firmware se obtienen aquí (y en N5 se usaba explícitamente getDeviceInfo para el modelo).

---

### 4.6 Platform (gestión del dispositivo)

- **Objeto:** `Platform platform = deviceEngine.getPlatform();`
- Instalación/desinstalación: `installApp(String appFilePath, OnAppOperatListener listener);` `uninstallApp(String appPackageName, OnAppOperatListener listener);`
- Firmware: `updateFirmware(String firmwareFilePath);` — solo firmware proporcionado por Nexgo.
- Sistema: `rebootDevice();` `shutDownDevice();`
- Navegación: `enableHomeButton()` / `disableHomeButton()`, `enableTaskButton()` / `disableTaskButton()`, `enableControlBar()` / `disableControlBar()`.
- Red: `switchMobileDataNetwork`, `setNetworkStatusListener`, `stopNetworkStatusListener`.
- Otros: `executeGeneralMethod(int cmd, byte[] inParam, byte[] otherParam, byte[] outData)`.

---

### 4.7 Serial

- **Objeto:** `SerialPortDriver port = deviceEngine.getSerialPortDriver(int portNo);`
- **portNo:** N5, N3, N86, N6, P200 = 0; UN20 = 1 o 2; N86 con dock = 101; **N6 (Android 10) countertop = 0**.
- Flujo: disconnect (por si estaba abierto) → connect → clrBuffer → send → recv → disconnect.
- Métodos típicos: `connect(...)`, `disconnect()`, `clrBuffer()`, `send()`, `recv()` (detalles en documentación de Serial class).

---

### 4.8 UsbSerial

- **Objeto:** `UsbSerial usbSerial = deviceEngine.getUsbSerial();`
- Requiere cable USB serie especial Nexgo.
- `open(UsbSerialCfgEntity entity, OnUsbSerialReadListener listener);` — entity: vid, pid, baudRate, dataBits, parity, stopBits.
- `close();` `clrBuffer();` `write(byte[] data, int dataLen);` `read(byte[] buffer, int readLen);` (máx. 4096 bytes).

---

### 4.9 Pinpad, MagCard, ICCard, RFCard, EMV

- Patrón común: getInstance/open → operación (inputPin, searchCard, etc.) → close.
- **Pinpad:** claves (writeMKey, writeWKey), MAC (calcMac), PIN (inputOnlinePin, inputOfflinePin, inputPinExternal), algoritmos (setAlgorithmMode, setCipherMode), DUKPT, TR31 (injectTr31Key, injectKBPK).
- **EMV:** EmvHandler y EmvHandler2; flujos contact/contactless; callbacks (onSelApp, onRequestAmount, etc.); N96 compatible con Android 10 y kernels PayPass, PayWave, etc.
- **CardReader:** contactless; Felica (setSupportFelica, setFelicaRequestCode, setFelicaSystemCode); datos crudos banda (setMagReaderRawData).
- Para N96/K110: EmvHandler2 `initReader` para lector externo; ExtPinpad para pinpad externo (K110).

---

## 5. Códigos de retorno (SdkResult)

- **Genéricos:** `Success = 0`, `Fail = -1`, `Param_In_Invalid = -2`, `TimeOut = -3`, `Device_Not_Ready = -4`.
- **Printer:** base -1000 (Printer_Print_Fail, Printer_AddPrnStr_Fail, Printer_AddImg_Fail, Printer_Busy, Printer_PaperLack, Printer_Wrong_Package, Printer_Fault, Printer_TooHot, Printer_UnFinished, Printer_NoFontLib, Printer_OutOfMemory, Printer_Other_Error).
- **Scanner:** base -2000 (Scanner_Customer_Exit, Scanner_Other_Error).
- **SerialPort:** base -4000 (Connect_Fail, Send_Fail, Fd_Error, Port_Not_Open, DisConnect_Fail, etc.).
- **MagCardReader:** base -5000 (No_Swiped, Other_Error).
- **IccCardReader:** base -6000 (Read_CardType_Error, CardInit_Error, Other_Error).
- **PinPad:** base -7000 (No_Key_Error, KeyIdx_Error, No_Pin_Input, Input_Cancel, Key_Len_Error, Input_Timeout, Open_Or_Close_Error, Deal_Error, Other_Error).
- **EMVHandler:** base -8000 (Other_Interface, Qpboc_Offline/Online, Card_Removed, Command_Fail, Card_Block, PARA_ERR, Candidatelist_Empty, App_Block, FallBack, Auth_Fail, App_Ineffect, App_Expired, etc.).

Todos los códigos están definidos en la clase `SdkResult` del SDK; ver apéndice del manual para la lista completa.

---

## 6. Resumen N96

- **Modelo:** Nexgo N96 (Android 10).
- **LED:** Usar `LightModeEnum.DECORATIVE_LIGHT` además de RED/GREEN/YELLOW/BLUE.
- **Serial:** `getSerialPortDriver(0)` para countertop.
- **Scanner:** Opción `hideFram` en Bundle (Scanner #1) requiere firmware reciente; soporte de `List<SymbolEnum>` en ScannerCfgEntity.
- **SDK:** 3.08.002; compatibilidad explícita desde V3.07.001 (N96, N82, N6 Android 10).
- **Firmware:** Actualizaciones solo con paquetes proporcionados por Nexgo.
- **Package AAR:** `com.nexgo.smartpos`; integración vía `APIProxy.getDeviceEngine(context)` y luego los getters de cada módulo.

Este documento resume la documentación del API 3.08.002 y el SPEC_IA; para firmas exactas y parámetros detallados conviene consultar el PDF original y el AAR en `C:\dev\ParkingOnStreet\Android\sdk`.
