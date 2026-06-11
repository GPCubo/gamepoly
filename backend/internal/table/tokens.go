package table

var defaultTokenModels = []string{
	"sombrero.glb",
	"dedal.glb",
	"tacon.glb",
	"cat.glb",
	"coffee.glb",
	"train.glb",
}

func normalizeTokenModel(model string, slotIndex int) string {
	for _, candidate := range defaultTokenModels {
		if model == candidate {
			return model
		}
	}

	if len(defaultTokenModels) == 0 {
		return "sombrero.glb"
	}
	if slotIndex < 0 {
		slotIndex = 0
	}
	return defaultTokenModels[slotIndex%len(defaultTokenModels)]
}
