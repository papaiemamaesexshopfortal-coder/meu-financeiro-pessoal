import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
export async function shareExport(content,name) {
  // Private cache is shared only through the Android destination chosen by the user.
  const {uri}=await Filesystem.writeFile({path:'exports/'+Date.now()+'-'+name,data:content,directory:Directory.Cache,encoding:Encoding.UTF8,recursive:true});
  await Share.share({title:name,files:[uri],dialogTitle:'Salvar ou compartilhar arquivo'});
}
