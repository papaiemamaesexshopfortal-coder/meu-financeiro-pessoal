const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const version=require(path.join(root,'package.json')).version;
const code=Number(process.env.ANDROID_VERSION_CODE||1);
if(!/^\d+\.\d+\.\d+$/.test(version)||!Number.isInteger(code)||code<1||code>2100000000)throw Error('Invalid Android version');
const app=path.join(root,'android','app');
const build=path.join(app,'build.gradle');
const reference="apply from: 'finance-release.gradle'";
if(!fs.readFileSync(build,'utf8').includes(reference))fs.appendFileSync(build,'\n'+reference+'\n');
// Keep passwords and private keys in environment secrets; never in Gradle source or artifacts.
fs.writeFileSync(path.join(app,'finance-release.gradle'),`
def financeStore = System.getenv('ANDROID_KEYSTORE_PATH')
def financeSigningRequired = System.getenv('ANDROID_SIGNED_RELEASE') == 'true'
if (financeSigningRequired && (!financeStore || !System.getenv('ANDROID_KEYSTORE_PASSWORD') || !System.getenv('ANDROID_KEY_ALIAS') || !System.getenv('ANDROID_KEY_PASSWORD'))) {
    throw new GradleException('Android release signing credentials are required')
}
android {
    defaultConfig {
        versionCode ${code}
        versionName '${version}'
    }
    if (financeStore) {
        signingConfigs {
            financeRelease {
                storeFile file(financeStore)
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
        buildTypes { release { signingConfig signingConfigs.financeRelease } }
    }
}
`);
console.log('Android version and optional release signing configured.');
