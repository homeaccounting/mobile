import { Image } from 'react-native';
import logo from '../../assets/images/logo.png';

// Shared brand mark, the same asset as web's BrandLogo (web/src/assets/logo.png).
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      source={logo}
      accessibilityRole="image"
      accessibilityLabel="HomeAccounting"
      resizeMode="contain"
      className={className}
    />
  );
}
