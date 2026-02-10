import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const { version, argv: nodeProcessArgv } = process;

export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

export function checkCommand(command, args = ['--version']) {
  try {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.status === 0) {
      return { pass: true, output: result.stdout.trim().split('\n')[0] };
    }
    return { pass: false, error: result.stderr?.trim() || '未知错误' };
  } catch (e) {
    return { pass: false, error: '未找到命令' };
  }
}

export function checkNodeVersion(currentVersion = version) {
  const major = parseInt(currentVersion.slice(1).split('.')[0], 10);
  if (major >= 18) {
    return { pass: true, output: currentVersion };
  }
  return { pass: false, error: `需要 Node.js >= 18.0.0, 当前版本 ${currentVersion}` };
}

export function checkNpmVersion(currentVersion) {
  if (currentVersion) {
    const major = parseInt(currentVersion.split('.')[0], 10);
    if (major >= 9) {
      return { pass: true, output: currentVersion };
    }
    return { pass: false, error: `需要 npm >= 9, 当前版本 ${currentVersion}` };
  }
  const result = checkCommand('npm', ['--version']);
  if (result.pass) {
    const major = parseInt(result.output.split('.')[0], 10);
    if (major >= 9) {
      return result;
    }
    return { pass: false, error: `需要 npm >= 9, 当前版本 ${result.output}` };
  }
  return result;
}

export function checkXcodeSelect() {
  const result = checkCommand('xcode-select', ['-p']);
  if (result.pass) {
    return { pass: true, output: result.output };
  }
  return { pass: false, error: '请运行 `xcode-select --install` 安装命令行工具' };
}

export function checkXcodeBuild() {
  const result = checkCommand('xcodebuild', ['-version']);
  if (result.pass) {
    return { pass: true, output: result.output.replace(/\n/g, ' ') };
  }
  return { 
    pass: false, 
    error: '未安装完整版 Xcode (缺少 xcodebuild)。如果仅构建 macOS 应用，建议安装以获得最佳兼容性。' 
  };
}

export function checkRustVersion(currentVersion) {
  if (!currentVersion) {
    const result = checkCommand('rustc');
    if (!result.pass) return result;
    currentVersion = result.output;
  }
  // rustc 1.85.0 (4d91de4e4 2025-02-17)
  const match = currentVersion.match(/rustc (\d+)\.(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major > 1 || (major === 1 && minor >= 85)) {
      return { pass: true, output: currentVersion };
    }
    return { pass: false, error: `需要 Rust >= 1.85.0 (支持 edition2024), 当前版本 ${currentVersion}。请运行 \`rustup update stable\`` };
  }
  return { pass: false, error: `无法解析 Rust 版本: ${currentVersion}` };
}

export function checkCargoVersion(currentVersion) {
  if (!currentVersion) {
    const result = checkCommand('cargo');
    if (!result.pass) return result;
    currentVersion = result.output;
  }
  // cargo 1.85.0 (98b30d359 2025-02-04)
  const match = currentVersion.match(/cargo (\d+)\.(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    if (major > 1 || (major === 1 && minor >= 85)) {
      return { pass: true, output: currentVersion };
    }
    return { pass: false, error: `需要 Cargo >= 1.85.0, 当前版本 ${currentVersion}。请运行 \`rustup update stable\`` };
  }
  return { pass: false, error: `无法解析 Cargo 版本: ${currentVersion}` };
}

export const checks = [
  { name: 'Node.js 版本', id: 'node', check: () => checkNodeVersion() },
  { name: 'npm 版本', id: 'npm', check: () => checkNpmVersion() },
  { name: 'rustc (Rust 编译器)', id: 'rustc', check: () => checkRustVersion() },
  { name: 'cargo (Rust 包管理器)', id: 'cargo', check: () => checkCargoVersion() },
  { name: 'xcode-select 路径', id: 'xcode-select', check: checkXcodeSelect },
  { name: 'xcodebuild (Xcode 编译工具)', id: 'xcodebuild', check: checkXcodeBuild, optional: true },
];

export async function runPrecheck() {
  console.log(`${colors.bold}=== Tauri 环境预检 ===${colors.reset}\n`);

  let allPass = true;

  for (const { name, check, optional } of checks) {
    const result = check();
    if (result.pass) {
      console.log(`${colors.green} [通过] ${colors.reset}${name}: ${colors.blue}${result.output}${colors.reset}`);
    } else if (optional) {
      console.log(`${colors.yellow} [提示] ${colors.reset}${name}: ${colors.yellow}${result.error}${colors.reset}`);
    } else {
      allPass = false;
      console.log(`${colors.red} [失败] ${colors.reset}${name}: ${colors.yellow}${result.error}${colors.reset}`);
    }
  }

  console.log('\n' + '='.repeat(30));
  if (allPass) {
    console.log(`${colors.green}${colors.bold}环境检查通过！可以开始 Tauri 开发。${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}${colors.bold}环境检查失败，请根据上方提示修复问题。${colors.reset}`);
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPrecheck().then(pass => {
    process.exit(pass ? 0 : 1);
  });
}

