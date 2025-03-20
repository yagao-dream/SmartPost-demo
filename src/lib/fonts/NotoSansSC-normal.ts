import { jsPDF } from 'jspdf';

// 添加中文字体支持
const NotoSansSC = {
  normal: {
    '0': 'a',
    '1': 'b',
    '2': 'c',
    '3': 'd',
    '4': 'e',
    '5': 'f',
    '6': 'g',
    '7': 'h',
    '8': 'i',
    '9': 'j',
    'a': 'k',
    'b': 'l',
    'c': 'm',
    'd': 'n',
    'e': 'o',
    'f': 'p'
  }
};

interface JsPDFWithVFS extends jsPDF {
  addFileToVFS(filename: string, data: Record<string, string>): void;
  addFont(postScriptName: string, id: string, fontStyle: string): void;
}

// 注册字体
(jsPDF as any).API.events.push(['addFonts', function(this: JsPDFWithVFS) {
  this.addFileToVFS('NotoSansSC-normal.ttf', NotoSansSC.normal);
  this.addFont('NotoSansSC-normal.ttf', 'NotoSansSC', 'normal');
}]); 