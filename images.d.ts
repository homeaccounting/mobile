// Metro resolves an imported image to an asset reference; expo/types doesn't declare these modules.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const source: ImageSourcePropType;
  export default source;
}
