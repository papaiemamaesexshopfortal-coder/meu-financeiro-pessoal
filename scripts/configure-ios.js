const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const xcode=require('xcode');
async function main(){
 const app=path.join(process.cwd(),'ios','App','App'),projectPath=path.join(app,'..','App.xcodeproj','project.pbxproj');
 const project=xcode.project(projectPath);project.parseSync();
 const group=project.findPBXGroupKey({path:'App'});if(!group)throw Error('iOS App resource group not found');
 let resources=project.findPBXGroupKey({name:'Resources'});
 if(!resources){resources=project.addPbxGroup([],'Resources','Resources').uuid;project.addToPbxGroup(resources,group);}
 fs.mkdirSync(path.join(app,'Resources'),{recursive:true});
 const privacy='PrivacyInfo.xcprivacy';
 fs.writeFileSync(path.join(app,'Resources',privacy),`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>NSPrivacyTracking</key><false/><key>NSPrivacyAccessedAPITypes</key><array><dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array></dict></array></dict></plist>
`);
 if(!project.hasFile(privacy))project.addResourceFile('Resources/'+privacy,{target:project.getFirstTarget().uuid},resources);
 const version=require(path.join(process.cwd(),'package.json')).version;
 project.updateBuildProperty('MARKETING_VERSION',version);
 project.updateBuildProperty('CURRENT_PROJECT_VERSION','1');
 project.updateBuildProperty('TARGETED_DEVICE_FAMILY','"1,2"');
 fs.writeFileSync(projectPath,project.writeSync());
 await sharp('icon.svg').resize(1024,1024).flatten({background:'#073b35'}).png().toFile(path.join(app,'Assets.xcassets','AppIcon.appiconset','AppIcon-512@2x.png'));
 console.log('iPhone/iPad project configured with icon and Filesystem API privacy reason.');
}
main().catch(error=>{console.error(error.message);process.exit(1)});
