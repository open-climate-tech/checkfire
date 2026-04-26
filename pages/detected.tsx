import dynamic from 'next/dynamic';
const DetectedFires = dynamic(() => import('../src/DetectedFires'), { ssr: false });
export default function Detected(props: any) {
  return <DetectedFires {...props} />;
}
