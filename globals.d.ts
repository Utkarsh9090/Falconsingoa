// Allows TypeScript to accept side-effect CSS imports like: import './globals.css';
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
