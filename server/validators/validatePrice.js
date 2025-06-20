function validatePrice(price) {
    const parsedPrice = parseFloat(parseFloat(price).toFixed(4));
    if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 1000000.0000) {
        throw new Error('Некоректна ціна: має бути > 0 і відповідати DECIMAL(13,4)');
    }
    return parsedPrice;
}

module.exports = {validatePrice}