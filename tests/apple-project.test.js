const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const appleRoot = path.join(projectRoot, 'apple', 'Simple Video Speed Controller');
const viewController = fs.readFileSync(
  path.join(appleRoot, 'Shared (App)', 'ViewController.swift'),
  'utf8'
);
const project = fs.readFileSync(
  path.join(appleRoot, 'Simple Video Speed Controller.xcodeproj', 'project.pbxproj'),
  'utf8'
);
const storeKitConfiguration = JSON.parse(fs.readFileSync(
  path.join(appleRoot, 'Configurations', 'TipProducts.storekit'),
  'utf8'
));
const iosAppInfo = fs.readFileSync(path.join(appleRoot, 'iOS (App)', 'Info.plist'), 'utf8');
const macAppInfo = fs.readFileSync(path.join(appleRoot, 'macOS (App)', 'Info.plist'), 'utf8');
const iosSceneDelegate = fs.readFileSync(path.join(appleRoot, 'iOS (App)', 'SceneDelegate.swift'), 'utf8');
const macAppDelegate = fs.readFileSync(path.join(appleRoot, 'macOS (App)', 'AppDelegate.swift'), 'utf8');
const appStoreID = fs.readFileSync(
  path.join(appleRoot, 'Configurations', 'AppStoreID.txt'),
  'utf8'
).trim();

test('Apple targets share the expected identifiers, versions, and deployment minimums', () => {
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = app\.chaseos\.SimpleVideoSpeedController;/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = app\.chaseos\.SimpleVideoSpeedController\.Extension;/);
  assert.doesNotMatch(project, /MARKETING_VERSION = 1\.0;/);
  assert.doesNotMatch(project, /IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/);
  assert.doesNotMatch(project, /MACOSX_DEPLOYMENT_TARGET = 10\.14;/);
  assert.match(project, /MARKETING_VERSION = 1\.15;/);
  assert.match(project, /IPHONEOS_DEPLOYMENT_TARGET = 16\.0;/);
  assert.match(project, /MACOSX_DEPLOYMENT_TARGET = 13\.0;/);
  assert.equal((project.match(/DEVELOPMENT_TEAM = QG4CBM3K89;/g) || []).length, 8);
  assert.equal((project.match(/com\.apple\.InAppPurchase/g) || []).length, 2);
});

test('native Apple UI uses SF Symbols and the deterministic App Store review link', () => {
  assert.match(viewController, /star\.fill/);
  assert.match(viewController, /heart\.fill/);
  assert.match(viewController, /action=write-review/);
  assert.match(viewController, /accessibilityReduceMotion/);
  assert.match(viewController, /accessibilityVoiceOverEnabled/);
  assert.match(viewController, /hostingController\.title = "Support Simple Video Speed Controller"/);
  assert.match(viewController, /Button\("Done", action: dismissAction\)/);
  assert.match(viewController, /dismiss\(tipSheetController\)/);
  assert.doesNotMatch(viewController, /requestReview|SKStoreReviewController/);
  assert.equal(appStoreID, '6806633069');
  assert.match(viewController, /url\(forResource: "AppStoreID", withExtension: "txt"\)/);
  assert.match(project, /AppStoreID\.txt in Resources/);
});

test('StoreKit code and local configuration use the same three consumable products', () => {
  const expectedProductIDs = [
    'app.chaseos.SimpleVideoSpeedController.tip.small',
    'app.chaseos.SimpleVideoSpeedController.tip.standard',
    'app.chaseos.SimpleVideoSpeedController.tip.generous'
  ];
  assert.deepEqual(storeKitConfiguration.products.map(product => product.productID), expectedProductIDs);
  assert.ok(storeKitConfiguration.products.every(product => product.type === 'Consumable'));
  for (const productID of expectedProductIDs) assert.match(viewController, new RegExp(productID));
  assert.match(viewController, /case \.pending:/);
  assert.match(viewController, /case \.userCancelled:/);
  assert.match(viewController, /case \.verified\(let transaction\)/);
  assert.match(viewController, /case \.unverified\(let transaction, _\)/);
  assert.match(viewController, /await transaction\.finish\(\)/);
});

test('both containing apps route the Safari support link to the native tip sheet', () => {
  assert.match(iosAppInfo, /<string>simplevideospeedcontroller<\/string>/);
  assert.match(macAppInfo, /<string>simplevideospeedcontroller<\/string>/);
  assert.match(iosSceneDelegate, /AppleAppLinkRouter\.shared\.handle\(url\)/);
  assert.match(macAppDelegate, /AppleAppLinkRouter\.shared\.handle\(url\)/);
  assert.match(viewController, /url\.host\?\.lowercased\(\) == "support"/);
  assert.match(viewController, /supportRequestPending = true/);
  assert.match(viewController, /viewController\.isReadyForPresentation/);
  assert.match(viewController, /override func viewDidAppear\(_ animated: Bool\)/);
  assert.match(viewController, /override func viewDidAppear\(\)/);
  assert.match(viewController, /AppleAppLinkRouter\.shared\.viewDidAppear\(\)/);
  assert.match(viewController, /viewController\.presentSupportOptions\(\)/);
});

test('both Safari extension targets bundle every icon referenced by the manifest', () => {
  for (const icon of ['icon-16.png', 'icon-48.png', 'icon-128.png']) {
    assert.match(project, new RegExp(`${icon.replace('.', '\\.')} \\*\\/ = \\{isa = PBXFileReference`));
    assert.equal(
      (project.match(new RegExp(`${icon.replace('.', '\\.')} in Resources`, 'g')) || []).length,
      4,
      `${icon} should have two build-file declarations and appear in both resource phases`
    );
  }
});
