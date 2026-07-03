'use client';
import { useState, useEffect, useCallback } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

interface TerminalDecodeProps {
  text: string;
  trigger: boolean;
  className?: string;
  staggerDelay?: number;
  resolveDuration?: number;
  cycleInterval?: number;
}

export default function TerminalDecode({
  text,
  trigger,
  className = '',
  staggerDelay = 30,
  resolveDuration = 800,
  cycleInterval = 50,
}: TerminalDecodeProps) {
  const [displayChars, setDisplayChars] = useState<string[]>(text.split('').map(() => ' '));

  const getRandomChar = useCallback(() => {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }, []);

  useEffect(() => {
    if (!trigger) {
      setDisplayChars(text.split('').map(() => ' '));
      return;
    }

    const targetChars = text.split('');

    setDisplayChars(targetChars.map(() => getRandomChar()));

    const charTimers: ReturnType<typeof setTimeout>[] = [];
    const cycleIntervals: ReturnType<typeof setInterval>[] = [];

    targetChars.forEach((targetChar, index) => {
      if (targetChar === ' ') {
        setDisplayChars(prev => {
          const next = [...prev];
          next[index] = ' ';
          return next;
        });
        return;
      }

      const startDelay = setTimeout(() => {
        const interval = setInterval(() => {
          setDisplayChars(prev => {
            const next = [...prev];
            next[index] = getRandomChar();
            return next;
          });
        }, cycleInterval);

        cycleIntervals.push(interval);

        const resolveTimer = setTimeout(() => {
          clearInterval(interval);
          setDisplayChars(prev => {
            const next = [...prev];
            next[index] = targetChar;
            return next;
          });
        }, resolveDuration);

        charTimers.push(resolveTimer);
      }, index * staggerDelay);

      charTimers.push(startDelay);
    });

    return () => {
      charTimers.forEach(clearTimeout);
      cycleIntervals.forEach(clearInterval);
    };
  }, [trigger, text, staggerDelay, resolveDuration, cycleInterval, getRandomChar]);

  return (
    <span className={className}>
      {displayChars.map((char, i) => (
        <span key={i} className={char !== ' ' && char === text[i] ? 'text-white' : 'text-purple'}>
          {char}
        </span>
      ))}
    </span>
  );
}
