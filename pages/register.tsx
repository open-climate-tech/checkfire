import dynamic from 'next/dynamic';
const Register = dynamic(() => import('../src/Register'), { ssr: false });
export default function RegisterPage(props: any) {
  return <Register {...props} />;
}
