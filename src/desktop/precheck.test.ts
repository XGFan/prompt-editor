import { describe, it, expect } from 'vitest';
import { checkNodeVersion, checkNpmVersion, checkRustVersion, checkCargoVersion } from '../../scripts/tauri-precheck.mjs';

describe('Tauri Precheck', () => {
  describe('checkNodeVersion', () => {
    it('should pass for Node.js >= 18', () => {
      expect(checkNodeVersion('v18.0.0').pass).toBe(true);
      expect(checkNodeVersion('v20.0.0').pass).toBe(true);
      expect(checkNodeVersion('v25.6.0').pass).toBe(true);
    });

    it('should fail for Node.js < 18', () => {
      const result = checkNodeVersion('v16.0.0');
      expect(result.pass).toBe(false);
      expect(result.error).toContain('需要 Node.js >= 18.0.0');
    });
  });

  describe('checkNpmVersion', () => {
    it('should pass for npm >= 9', () => {
      expect(checkNpmVersion('9.0.0').pass).toBe(true);
      expect(checkNpmVersion('10.0.0').pass).toBe(true);
      expect(checkNpmVersion('11.8.0').pass).toBe(true);
    });

    it('should fail for npm < 9', () => {
      const result = checkNpmVersion('8.0.0');
      expect(result.pass).toBe(false);
      expect(result.error).toContain('需要 npm >= 9');
    });
  });

  describe('checkRustVersion', () => {
    it('should pass for Rust >= 1.85.0', () => {
      expect(checkRustVersion('rustc 1.85.0 (4d91de4e4 2025-02-17)').pass).toBe(true);
      expect(checkRustVersion('rustc 1.93.0 (hash date)').pass).toBe(true);
    });

    it('should fail for Rust < 1.85.0', () => {
      const result = checkRustVersion('rustc 1.83.0 (hash date)');
      expect(result.pass).toBe(false);
      expect(result.error).toContain('需要 Rust >= 1.85.0');
      expect(result.error).toContain('rustup update stable');
    });

    it('should fail for invalid version string', () => {
      expect(checkRustVersion('invalid').pass).toBe(false);
    });
  });

  describe('checkCargoVersion', () => {
    it('should pass for Cargo >= 1.85.0', () => {
      expect(checkCargoVersion('cargo 1.85.0 (98b30d359 2025-02-04)').pass).toBe(true);
      expect(checkCargoVersion('cargo 1.93.0 (hash date)').pass).toBe(true);
    });

    it('should fail for Cargo < 1.85.0', () => {
      const result = checkCargoVersion('cargo 1.83.0 (hash date)');
      expect(result.pass).toBe(false);
      expect(result.error).toContain('需要 Cargo >= 1.85.0');
      expect(result.error).toContain('rustup update stable');
    });
  });
});
