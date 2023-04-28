/**
 * ChatGPT-generated. Returns elements that are present in more than one of the given arrays.
 */
export function findSharedElements(arrays: string[][]): string[] {
  // Create an object to keep track of the frequency of each element
  const elementFrequency: { [key: string]: number } = {};
  
  // Iterate through each array and increment the frequency of each element
  arrays.forEach((array) => {
    array.forEach((element) => {
      if (element in elementFrequency) {
        elementFrequency[element]++;
      } else {
        elementFrequency[element] = 1;
      }
    });
  });
  console.log("Frequencies before filter: "+JSON.stringify(elementFrequency));
  // Filter out elements whose frequency is less than the length of the input array
  const sharedElements = Object.keys(elementFrequency).filter((key) => {
    return elementFrequency[key] > 1;
  });
  
  return sharedElements;
}

