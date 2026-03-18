// Convert number to words (Indian numbering system)
function numberToWords(num) {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convertLessThanThousand(n) {
        if (n === 0) return '';
        
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    }

    // Split into crores, lakhs, thousands, hundreds
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const remainder = num;

    let result = '';

    if (crore > 0) {
        result += convertLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
        result += convertLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
        result += convertLessThanThousand(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
        result += convertLessThanThousand(remainder);
    }

    return result.trim();
}

function amountToWords(amount) {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = numberToWords(rupees) + ' Rupees';
    
    if (paise > 0) {
        result += ' and ' + numberToWords(paise) + ' Paise';
    }
    
    result += ' Only';
    
    return result;
}

module.exports = { amountToWords };
