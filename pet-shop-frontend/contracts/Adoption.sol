pragma solidity ^0.4.17;

contract Adoption {
	address[16] public adopters;

    event Adopted(uint petId, address owner);

	function adopt(uint petId) public returns (uint) {
  		require(petId >= 0 && petId <= 15);

        adopters[petId] = msg.sender;

        // Let the database know a pet was adopted
        Adopted(petId, msg.sender);

        return petId;
    }

    // Retrieving the adopters
    function getAdopters() public view returns (address[16]) {
        return adopters;
    }
}