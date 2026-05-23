import { render } from '@testing-library/react';
import RightSidebar from '../components/RightSidebar';
import { QRCodeSVG } from 'qrcode.react';

// Mock the QRCodeSVG component to check its props
jest.mock('qrcode.react', () => ({
  QRCodeSVG: jest.fn(() => <div data-testid="qr-code" />),
}));

describe('QR Code Printing Compatibility', () => {
  it('should render QR code with print-optimized settings', () => {
    render(<RightSidebar />);
    
    // Check if QRCodeSVG was called with the correct props for printing
    expect(QRCodeSVG).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 256,
        level: 'H',
        includeMargin: true,
      }),
      expect.anything()
    );
  });
});
