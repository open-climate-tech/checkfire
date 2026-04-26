import dynamic from 'next/dynamic';
const Preferences = dynamic(() => import('../src/Preferences'), { ssr: false });
export default function PreferencesPage(props: any) {
  return <Preferences {...props} />;
}
