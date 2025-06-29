// ye function ko export kar rahe hain taaki dusre file me bhi use ho sake
export const catchAsyncError = (theFunction) => {
  // ye ek naya middleware return kar raha jo req, res, next accept karta
  return (req, res, next) => {
    // yaha hum user ke diye gaye async function ko promise me wrap kar rahe hain
    // agar usme error aayi to .catch se next() ko call karke error middleware ko bhej denge
    Promise.resolve(theFunction(req, res, next)).catch(next);
  };
};
