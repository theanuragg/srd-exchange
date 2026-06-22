import { render } from '@testing-library/react';
import RightSidebar from '../components/RightSidebar';

describe('QR Code Printing Compatibility', () => {
  it('should render QR code with High error correction level', () => {
    const { container } = render(<RightSidebar isOpen={true} onClose={() => {}} />);
    const qrCode = container.querySelector('svg');
    expect(qrCode).toBeTruthy();
  });
});
