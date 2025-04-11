declare module 'react-native-confetti' {
  import React from 'react';
  
  export interface ConfettiProps {
    duration?: number;
    timeout?: number;
    colors?: string[];
  }
  
  export default class Confetti extends React.Component<ConfettiProps> {
    startConfetti(): void;
    stopConfetti(): void;
  }
} 